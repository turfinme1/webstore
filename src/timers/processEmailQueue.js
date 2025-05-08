const webpush = require("../serverConfigurations/webpushWrapper");
const pool = require("../database/dbConfig");
const { EmailService, transporter } = require("../services/emailService");
const { TemplateLoader } = require("../serverConfigurations/templateLoader");
const Logger = require("../serverConfigurations/logger");
const { ENV } = require("../serverConfigurations/constants");
const { ASSERT } = require("../serverConfigurations/assert");
const { hrtime } = require("process");

const isDryRun = process.env.DRY_RUN === 'true';

const BATCH_SIZE = 10000;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = 2;
const EMAIL_MESSAGE_TYPE = 'Email';
const PUSH_MESSAGE_TYPE = 'Push-Notification';
const PUSH_MESSAGE_BROADCAST_TYPE = 'Push-Notification-Broadcast';
const IN_APP_MESSAGE_TYPE = 'Notification';

const MESSAGE_STATUS = {
    PENDING: 'pending',
    SENDING: 'sending',
    SENT: 'sent',
    SEEN: 'seen',
    FAILED: 'failed',
    EXPIRED: 'expired',
};

const NOTIFICATION_STATUS = {
    ACTIVE: 'active',
    BLOCKED: 'blocked',
    INACTIVE: 'inactive',
}

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

    try {
        console.log('Starting processEmailQueue');
        const start = hrtime();
        const templateLoader = new TemplateLoader();
        const emailService = new EmailService(transporter, templateLoader);
        
        console.log('[processEmailQueue] Aquire client from pool...');
        client = await pool.connect();
        logger = new Logger({ dbConnection: client });
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
                WHERE type IN ($1, $2, $3, $4)
                  AND status = $5
                  AND (email_last_attempt IS NULL OR email_last_attempt < NOW() - INTERVAL '${RETRY_DELAY_MINUTES} minutes')
                  AND email_attempts < $6
                  AND (email_retry_after IS NULL OR email_retry_after < NOW())
                ORDER BY email_priority DESC, created_at DESC
                LIMIT $7
                FOR UPDATE SKIP LOCKED
            )
            UPDATE emails
            SET status = $8,    
                email_processing_started_at = NOW()
            FROM cte
            WHERE emails.id = cte.id
            RETURNING emails.*;`,
            [EMAIL_MESSAGE_TYPE, PUSH_MESSAGE_TYPE, PUSH_MESSAGE_BROADCAST_TYPE, IN_APP_MESSAGE_TYPE, MESSAGE_STATUS.PENDING, MAX_ATTEMPTS, BATCH_SIZE, MESSAGE_STATUS.SENDING]);
        await client.query(`COMMIT`);

        const processResult = await Promise.all(
            pendingEmails.rows.map(async (email) => 
                processMessage(email, client, logger, emailService)
            )
        )

        await client.query('BEGIN');
        await client.query(`
            UPDATE emails
            SET status = $1,
                email_retry_after = NOW() + (INTERVAL '1 minute' * $2)
            WHERE email_processing_started_at < NOW() - INTERVAL '10 minutes'
            AND status = $3`,
            [MESSAGE_STATUS.PENDING, RETRY_BACKOFF.INITIAL_DELAY, MESSAGE_STATUS.SENDING]);
        await client.query('COMMIT');

        const end = hrtime(start);
        const elapsedTime = (end[0] * 1e9 + end[1]) / 1e6;
        console.log(`Email queue process completed in ${elapsedTime} ms`);
        await logger.info({
            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00017.EMAIL_QUEUE_PROCESS_SUCCESS',
            short_description: 'Email queue process completed',
            long_description: 'Email queue process completed'
        });
    } catch (error) {
        console.log(error);
        if (client) await client.query('ROLLBACK');
        if (logger) await logger.error(error);
    } finally {
        if (client) {
            console.log('[processEmailQueue] Released client to pool');
            client.release();
        }
    }
})();

async function processMessage(email, client, logger, emailService) {
    try {
        if(email.type === 'Push-Notification') {
            const subscriptions = await client.query(`
                SELECT * FROM push_subscriptions
                WHERE user_id = $1 AND status = $2`,
                [email.recipient_id, NOTIFICATION_STATUS.ACTIVE]
            );

            if(subscriptions.rows.length === 0) {
                await client.query(`
                    UPDATE emails
                    SET status = $1
                    WHERE id = $2`,
                    [MESSAGE_STATUS.FAILED, email.id]
                );

                await logger.info({
                    code: 'TIMERS.PROCESS_EMAIL_QUEUE.00005.NO_SUBSCRIPTIONS',
                    short_description: 'Email queue process completed',
                    long_description: 'Email queue process completed'
                });

                return { id: email.id, success: false };
            }

            let sendNotificationCount = 0;
            for (const subscription of subscriptions.rows) {
                try {
                    await webpush.sendNotification(subscription.data, JSON.stringify({ id: email.id, title: email.subject, body: email.text_content }));
                    sendNotificationCount++;
                } catch (error) {
                    console.log(`[processEmailQueue] error: ${error}`);
                    const { errorType } = classifyEmailError(error);

                    if(errorType === EMAIL_ERROR_TYPES.SUBSCRIPTION_NOT_FOUND) {
                        await client.query(`
                            UPDATE push_subscriptions
                            SET status = $1
                            WHERE id = $2`,
                            [NOTIFICATION_STATUS.INACTIVE, subscription.id]
                        );
                    }
                }
            }

            if (sendNotificationCount === 0) {
                await client.query(`
                    UPDATE emails
                    SET status = $1
                    WHERE id = $2`,
                    [MESSAGE_STATUS.FAILED, email.id]
                );
                return { id: email.id, success: false };
            }
        } else if (email.type === 'Push-Notification-Broadcast') {
            const subscription = await client.query(`
                SELECT * FROM push_subscriptions
                WHERE id = $1 AND status = $2`,
                [email.push_subscription_id, NOTIFICATION_STATUS.ACTIVE]
            );
            ASSERT(subscription.rows.length <= 1, 'Expected exactly one subscription for broadcast', { code: 'TIMERS.PROCESS_EMAIL_QUEUE.00017.EXPECTED_ONE_SUBSCRIPTION', long_description: `Expected exactly one subscription for broadcast with email id: ${email.id}` });

            if (subscription.rows.length === 0) {
                await client.query(`
                    UPDATE emails
                    SET status = $1
                    WHERE id = $2`,
                    [MESSAGE_STATUS.FAILED, email.id]
                );
                await logger.info({
                    code: 'TIMERS.PROCESS_EMAIL_QUEUE.00006.NO_SUBSCRIPTIONS',
                    short_description: 'No push subscriptions found',
                    long_description: 'No push subscriptions available for broadcast'
                });
                return { id: email.id, success: false };
            }

            const pushSubscription = subscription.rows[0];

            await webpush.sendNotification(pushSubscription.data, JSON.stringify({ id: email.id, title: email.subject, body: email.text_content }));
        } else if (email.type === 'Notification') {
            const expirationUpdateResult = await client.query(`
                UPDATE emails e
                    SET status = $1
                FROM notifications n
                WHERE e.id = $2
                    AND e.notification_id = n.id
                    AND e.type         = 'Notification'
                    AND n.valid_date   < NOW()
                RETURNING e.id;`,
                [MESSAGE_STATUS.EXPIRED, email.id]
            );
            if (expirationUpdateResult.rows.length > 0) {
                return { id: email.id, success: false };
            }

            if (isDryRun) {
                console.log(
                    `[processEmailQueue] request payload: ${JSON.stringify({
                    method: "POST",
                    url: `${ENV.WEB_SOCKET_API_URL}/message`,
                    body: {
                        type: "message",
                        user_id: email.recipient_id,
                        payload: {
                        id: email.id,
                        title: email.subject,
                        body: email.text_content,
                        },
                    },
                    })}`
                );

                return { id: email.id, success: true };
            }

            const result = await fetch(`${ENV.WEB_SOCKET_API_URL}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'message',
                    user_id: email.recipient_id,
                    payload: {
                        id: email.id,
                        title: email.subject,
                        body: email.text_content,
                    },
                }),
            });

            if (result.status === 404) {
                return { id: email.id, success: false };
            } else if (result.status === 400) {
                await client.query(`
                    UPDATE emails
                    SET status = $1
                    WHERE id = $2`,
                    [MESSAGE_STATUS.FAILED, email.id]
                );
                return { id: email.id, success: false };
            } else if (result.status === 500) {
                const retryDelay = calculateRetryDelay(email.email_attempts + 1);
                await client.query(`
                    UPDATE emails
                    SET status = $1,
                        email_attempts = email_attempts + 1,
                        email_last_attempt = NOW(),
                        email_retry_after = NOW() + (INTERVAL '1 minute' * $2),
                        email_priority = GREATEST(email_priority - 1, 1)
                    WHERE id = $3`,
                    [MESSAGE_STATUS.PENDING, retryDelay, email.id]
                );
                return { id: email.id, success: false };
            }
        } else {
            const emailOptions = { 
                from: "no-reply@web-store4eto.com",
                to: email.recipient_email,
                subject: email.subject,
                html: email.text_content
            };
            await emailService.sendEmail(emailOptions);
        }
        
        await client.query(`
            UPDATE emails 
            SET status = $1, sent_at = NOW()
            WHERE id = $2`, 
            [MESSAGE_STATUS.SENT, email.id]
        );
        
        return { id: email.id, success: true };
    } catch (error) {
        console.log(`[processEmailQueue] error: ${error}`);
        const { shouldRetry, errorType } = classifyEmailError(error);
        const retryDelay = calculateRetryDelay(email.email_attempts + 1);
        error.params = { 
            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00010.SENDING_FAILED', 
            long_description: errorType 
        };
        
        const maxAttemptsReached = email.email_attempts + 1 >= MAX_ATTEMPTS;
        const newStatus = (shouldRetry && !maxAttemptsReached) ? MESSAGE_STATUS.PENDING : MESSAGE_STATUS.FAILED;
        
        await client.query(`
            UPDATE emails 
            SET status = $1,
                email_attempts = email_attempts + 1,
                email_last_attempt = NOW(),
                email_retry_after = NOW() + (INTERVAL '1 minute' * $2),
                email_priority = GREATEST(email_priority - 1, 1)
            WHERE id = $3
        `, [newStatus, retryDelay, email.id]);

        if(errorType === EMAIL_ERROR_TYPES.SUBSCRIPTION_NOT_FOUND && email.push_subscription_id) {
            await client.query(`
                UPDATE push_subscriptions
                SET status = $1
                WHERE id = $2`,
                [NOTIFICATION_STATUS.INACTIVE, email.push_subscription_id]
            );
        }

        await logger.error(error);
        return { id: email.id, success: false, errorType };
    }
}

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
    } else if (error?.cause?.code === 'UND_ERR_HEADERS_TIMEOUT') {
        // timeout on fetch request
        shouldRetry = true;
        errorType = EMAIL_ERROR_TYPES.NETWORK;
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