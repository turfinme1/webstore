const pool = require("../database/dbConfig");
const { EmailService, transporter } = require("../services/emailService");
const { TemplateLoader } = require("../serverConfigurations/templateLoader");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const { v4: uuidv4 } = require('uuid');

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = 2;

const EMAIL_STATUS = {
    QUEUED: 'queued',
    SENDING: 'sending',
    SENT: 'sent',
    RETRY: 'retry',
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
        const lockId = uuidv4();

        await client.query('BEGIN');
        const pendingEmails = await client.query(`
            UPDATE emails
            SET status = $1, 
                processing_started_at = NOW(),
                lock_id = $2
            WHERE id IN (
                SELECT id FROM emails
                WHERE status IN ($3, $4)
                AND (last_attempt IS NULL OR last_attempt < NOW() - INTERVAL '${RETRY_DELAY_MINUTES} minutes')
                AND attempts < $5
                AND lock_id IS NULL
                AND (retry_after IS NULL OR retry_after < NOW())
                AND NOT EXISTS (
                    SELECT 1 FROM emails 
                    WHERE created_at > created_at - INTERVAL '1 minute'
                    AND status = $1
                )
                ORDER BY priority, created_at ASC
                LIMIT $6
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *`,
            [EMAIL_STATUS.SENDING, lockId, EMAIL_STATUS.QUEUED, EMAIL_STATUS.RETRY, MAX_ATTEMPTS, BATCH_SIZE]
        );

        for (const email of pendingEmails.rows) {
            try {
                await client.query('SAVEPOINT email_processing_savepoint');
                const emailOptions = await emailService.processTemplate({ emailData: email.data_object, dbConnection: client });
                
                await emailService.sendEmail(emailOptions);
                await client.query(`
                    UPDATE emails 
                    SET status = $1,
                        sent_at = NOW(),
                        lock_id = NULL,
                        error = NULL
                    WHERE id = $2 AND lock_id = $3`,
                    [EMAIL_STATUS.SENT, email.id, lockId]
                );
                await client.query('RELEASE SAVEPOINT email_processing_savepoint');
            } catch (error) {
                await client.query('ROLLBACK TO SAVEPOINT email_processing_savepoint');
                const errorType = classifyEmailError(error);
                const retryDelay = calculateRetryDelay(email.attempts + 1);
                
                await client.query(`
                    UPDATE emails 
                    SET status = $1,
                        error_type = $2,
                        error = $3,
                        attempts = attempts + 1,
                        last_attempt = NOW(),
                        lock_id = NULL,
                        retry_after = NOW() + (INTERVAL '1 minute' * $4),
                        priority = GREATEST(priority - 1, 1)
                    WHERE id = $5 AND lock_id = $6`,
                    [EMAIL_STATUS.RETRY, errorType, error.message, retryDelay, email.id, lockId]
                );

                await logger.error(error);
            }
        }
        
        await client.query('COMMIT');

        await client.query(`
            UPDATE emails
            SET lock_id = NULL,
                status = $1,
                retry_after = NOW() + (INTERVAL '1 minute' * $2)
            WHERE processing_started_at < NOW() - INTERVAL '5 minutes'
            AND status = $3`,
            [EMAIL_STATUS.RETRY, RETRY_BACKOFF.INITIAL_DELAY, EMAIL_STATUS.SENDING]
        );

        await logger.info({
            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00017.EMAIL_QUEUE_PROCESS_SUCCESS',
            short_description: 'Email queue process completed',
            long_description: 'Email queue process completed'
        });
    } catch (error) {
        if(client) await client.query('ROLLBACK');
        if(logger) await logger.error(error);
    } finally {
        if(client){
            client.release();
        }
        if(loggerClient){
            loggerClient.release();
        }
    }
})();

function classifyEmailError(error) {
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === "ESOCKET") {
        return EMAIL_ERROR_TYPES.NETWORK;
    }
    if (error.responseCode) {
        if ([421, 450, 451].includes(error.responseCode)) {
            return EMAIL_ERROR_TYPES.RATE_LIMIT;
        }
        if ([511, 535].includes(error.responseCode)) {
            return EMAIL_ERROR_TYPES.AUTH;
        }
        if ([550, 553].includes(error.responseCode)) {
            return EMAIL_ERROR_TYPES.INVALID_RECIPIENT;
        }
        return EMAIL_ERROR_TYPES.SMTP;
    }
    return error.code;
}

function calculateRetryDelay(attempts) {
    const delay = RETRY_BACKOFF.INITIAL_DELAY * Math.pow(RETRY_BACKOFF.MULTIPLIER, attempts - 1);
    return Math.min(delay, RETRY_BACKOFF.MAX_DELAY);
}