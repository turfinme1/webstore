const webpush = require("web-push");
const pool = require("../database/dbConfig");
const { EmailService, transporter } = require("../services/emailService");
const { TemplateLoader } = require("../serverConfigurations/templateLoader");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const { ENV } = require("../serverConfigurations/constants");

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = 2;
const MESSAGE_TYPE = 'Email';
const PUSH_MESSAGE_TYPE = 'Push-Notification';

const EMAIL_STATUS = {
    PENDING: 'pending',
    SENDING: 'sending',
    SENT: 'sent',
    SEEN: 'seen',
    FAILED: 'failed'
};

const RETRY_BACKOFF = {
    INITIAL_DELAY: 5, // minutes
    MAX_DELAY: 120, // 2 hours
    MULTIPLIER: 2
};

const EMAIL_ERROR_TYPES = {
    NETWORK: 'network_error',
    SMTP: 'smtp_error',
    AUTH: 'auth_error',
    RATE_LIMIT: 'rate_limit',
    INVALID_RECIPIENT: 'invalid_recipient',
    INVALID_INPUT: 'invalid_input',
    SUBSCRIPTION_NOT_FOUND: 'subscription_not_found',
    EXTERNAL_SERVER_ERROR: 'external_server_error',
};

(async () => {
    let client;
    let logger;
    let loggerClient;

    try {
        const templateLoader = new TemplateLoader();
        const emailService = new EmailService(transporter, templateLoader);
        
        client = await pool.connect();
        loggerClient = await pool.connect();
        logger = new Logger({ dbConnection: new DbConnectionWrapper(loggerClient) });
        webpush.setVapidDetails(
            ENV.VAPID_MAILTO,
            ENV.VAPID_PUBLIC_KEY,
            ENV.VAPID_PRIVATE_KEY,
        );

        await client.query('BEGIN');

        const pendingEmails = await client.query(`
            WITH cte AS (
                SELECT id
                FROM emails
                WHERE type IN ($1, $2)
                  AND status = $3
                  AND (email_last_attempt IS NULL OR email_last_attempt < NOW() - INTERVAL '${RETRY_DELAY_MINUTES} minutes')
                  AND email_attempts < $4
                  AND (email_retry_after IS NULL OR email_retry_after < NOW())
                ORDER BY email_priority DESC, created_at ASC
                LIMIT $5
                FOR UPDATE SKIP LOCKED
            )
            UPDATE emails
            SET status = $6,
                email_processing_started_at = NOW()
            FROM cte
            WHERE emails.id = cte.id
            RETURNING emails.*;
        `, [MESSAGE_TYPE, PUSH_MESSAGE_TYPE, EMAIL_STATUS.PENDING, MAX_ATTEMPTS, BATCH_SIZE, EMAIL_STATUS.SENDING]);

        for (const email of pendingEmails.rows) {
            try {
                await client.query('SAVEPOINT email_processing_savepoint');

                if(email.type === 'Push-Notification') {
                    const subscriptions = await client.query(`
                        SELECT * FROM push_subscriptions
                        WHERE user_id = $1`,
                        [email.recipient_id]
                    );

                    if(subscriptions.rows.length === 0) {
                        await client.query(`
                            UPDATE emails
                            SET status = $1
                            WHERE id = $2`,
                            [EMAIL_STATUS.FAILED, email.id]
                        );

                        await logger.info({
                            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00005.NO_SUBSCRIPTIONS',
                            short_description: 'Email queue process completed',
                            long_description: 'Email queue process completed'
                        });

                        continue; 
                    }

                    for (const subscription of subscriptions.rows) {
                        await webpush.sendNotification(subscription.data, JSON.stringify({ id: email.id, title: email.subject, body: email.text_content }));
                    }
                
                    await client.query(`
                        UPDATE emails 
                        SET status = $1, sent_at = NOW()
                        WHERE id = $2`, 
                        [EMAIL_STATUS.SENT, email.id]
                    );
                } else {
                    const emailOptions = { 
                        from: "no-reply@web-store4eto.com",
                        to: email.recipient_email,
                        subject: email.subject,
                        html: email.text_content
                    };
                    await emailService.sendEmail(emailOptions);

                    await client.query(`
                        UPDATE emails 
                        SET status = $1, sent_at = NOW()
                        WHERE id = $2`, 
                        [EMAIL_STATUS.SENT, email.id]
                    );
                }

                await client.query('RELEASE SAVEPOINT email_processing_savepoint');
            } catch (error) {
                await client.query('ROLLBACK TO SAVEPOINT email_processing_savepoint');
                const { shouldRetry, errorType } = classifyEmailError(error);
                const retryDelay = calculateRetryDelay(email.email_attempts + 1);
                error.params = { 
                    code: 'TIMERS.PROCESS_EMAIL_QUEUE.00010.SENDING_FAILED', 
                    long_description: errorType 
                };
                
                const maxAttemptsReached = email.email_attempts + 1 >= MAX_ATTEMPTS;
                const newStatus = (shouldRetry && !maxAttemptsReached) ? EMAIL_STATUS.PENDING : EMAIL_STATUS.FAILED;
                
                await client.query(`
                    UPDATE emails 
                    SET status = $1,
                        email_attempts = email_attempts + 1,
                        email_last_attempt = NOW(),
                        email_retry_after = NOW() + (INTERVAL '1 minute' * $2),
                        email_priority = GREATEST(email_priority - 1, 1)
                    WHERE id = $3
                `, [newStatus, retryDelay, email.id]);

                await logger.error(error);
            }
        }

        await client.query(`
            UPDATE emails
            SET status = $1,
                email_retry_after = NOW() + (INTERVAL '1 minute' * $2)
            WHERE email_processing_started_at < NOW() - INTERVAL '10 minutes'
            AND status = $3
        `, [EMAIL_STATUS.PENDING, RETRY_BACKOFF.INITIAL_DELAY, EMAIL_STATUS.SENDING]);

        await client.query('COMMIT');

        await logger.info({
            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00017.EMAIL_QUEUE_PROCESS_SUCCESS',
            short_description: 'Email queue process completed',
            long_description: 'Email queue process completed'
        });
    } catch (error) {
        if (client) await client.query('ROLLBACK');
        if (logger) await logger.error(error);
    } finally {
        if (client) {
            client.release();
        }
        if (loggerClient) {
            loggerClient.release();
        }
    }
})();

function classifyEmailError(error) {
    let shouldRetry = false;
    let errorType;
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === "ESOCKET") {
        errorType = EMAIL_ERROR_TYPES.NETWORK;
    } else if (error.responseCode) {
        if ([421, 450, 451].includes(error.responseCode)) {
            shouldRetry = true;
            errorType = EMAIL_ERROR_TYPES.RATE_LIMIT;
        } else if ([511, 535].includes(error.responseCode)) {
            errorType = EMAIL_ERROR_TYPES.AUTH;
        } else if ([550, 553].includes(error.responseCode)) {
            errorType = EMAIL_ERROR_TYPES.INVALID_RECIPIENT;
        } else {
            shouldRetry = true;
            errorType = EMAIL_ERROR_TYPES.SMTP;
        }
    } else if (error.statusCode) {
        if ([410].includes(error.statusCode)) {
            errorType = EMAIL_ERROR_TYPES.SUBSCRIPTION_NOT_FOUND;
        } else if ([400, 403, 404, 413].includes(error.responseCode)) {
            errorType = EMAIL_ERROR_TYPES.INVALID_INPUT;
        } else {
            shouldRetry = true;
            errorType = EMAIL_ERROR_TYPES.EXTERNAL_SERVER_ERROR;
        }
    } else {
        errorType = EMAIL_ERROR_TYPES.EXTERNAL_SERVER_ERROR;
    }

    return {
        shouldRetry,
        errorType
    };
}

function calculateRetryDelay(attempts) {
    const delay = RETRY_BACKOFF.INITIAL_DELAY * Math.pow(RETRY_BACKOFF.MULTIPLIER, attempts - 1);
    return Math.min(delay, RETRY_BACKOFF.MAX_DELAY);
}