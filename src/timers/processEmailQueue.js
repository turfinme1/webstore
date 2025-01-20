const pool = require("../database/dbConfig");
const { EmailService, transporter } = require("../services/emailService");
const { TemplateLoader } = require("../serverConfigurations/templateLoader");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const { v4: uuidv4 } = require('uuid');

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MINUTES = 5;

const EMAIL_STATUS = {
    QUEUED: 'queued',
    SENDING: 'sending',
    SENT: 'sent',
    FAILED: 'failed',
    RETRY: 'retry',
    ABANDONED: 'abandoned'
};

const EMAIL_ERROR_TYPES = {
    NETWORK: 'network_error',
    SMTP: 'smtp_error',
    AUTH: 'auth_error',
    RATE_LIMIT: 'rate_limit',
    INVALID_RECIPIENT: 'invalid_recipient',
    TIMEOUT: 'timeout',
    CONTENT: 'content_error',
    UNKNOWN: 'unknown'
};

(async () => {
    let client;
    let logger;
    let emailId;

    try {
        const templateLoader = new TemplateLoader();
        const emailService = new EmailService(transporter, templateLoader);
        
        client = await pool.connect();
        logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });
        const lockId = uuidv4();

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
                AND NOT EXISTS (
                    SELECT 1 FROM emails 
                    WHERE recipient = e.recipient 
                    AND created_at > e.created_at - INTERVAL '1 minute'
                    AND status = $1
                )
                ORDER BY priority DESC, created_at ASC
                LIMIT $6
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *`,
            [EMAIL_STATUS.SENDING, lockId, EMAIL_STATUS.QUEUED, EMAIL_STATUS.RETRY, MAX_ATTEMPTS, BATCH_SIZE]
        );

        for (const email of pendingEmails.rows) {
            try {
                emailId = email.id;
                const emailOptions = await emailService.processTemplate({ emailData: email.data_object, dbConnection: client });
                await emailService.sendEmail(emailOptions);
                await client.query(
                    `UPDATE emails
                    SET status = 'sent', sent_at = NOW() 
                    WHERE id = $1`,
                    [email.id]
                );

                await client.query(`
                    UPDATE emails 
                    SET status = $1,
                        sent_at = NOW(),
                        lock_id = NULL,
                        error = NULL
                    WHERE id = $2 AND lock_id = $3`,
                    [EMAIL_STATUS.SENT, email.id, lockId]
                );

            } catch (error) {
                const errorType = classifyEmailError(error);
                const shouldRetry = shouldRetryError(errorType, email.attempts);

                await client.query(`
                    UPDATE emails 
                    SET status = $1,
                        error_type = $2,
                        error = $3,
                        attempts = attempts + 1,
                        last_attempt = NOW(),
                        lock_id = NULL,
                        retry_after = CASE 
                            WHEN $4 THEN NOW() + (INTERVAL '${RETRY_DELAY_MINUTES} minutes' * attempts)
                            ELSE NULL 
                        END
                    WHERE id = $5 AND lock_id = $6`,
                    [shouldRetry ? EMAIL_STATUS.RETRY : EMAIL_STATUS.ABANDONED, errorType, error.message, shouldRetry, emailId, lockId]
                );    
            }
        }

        await client.query('COMMIT');

        await client.query(`
            UPDATE emails
            SET lock_id = NULL,
                status = CASE 
                    WHEN attempts < $1 THEN $2
                    ELSE $3
                END
            WHERE processing_started_at < NOW() - INTERVAL '5 minutes'
            AND status = $4`,
            [MAX_ATTEMPTS, EMAIL_STATUS.RETRY, EMAIL_STATUS.ABANDONED, EMAIL_STATUS.SENDING]
        );

        await logger.info({
            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00017.EMAIL_QUEUE_PROCESS_SUCCESS',
            short_description: 'Email queue process completed',
            long_description: 'Email queue process completed'
        });
    } catch (error) {
        try {
            if(client) {
                await client.query('ROLLBACK');
    
                await client.query(
                    `UPDATE emails 
                    SET attempts = attempts + 1, last_attempt = NOW() 
                    WHERE id = $1`,
                    [emailId]
                );
            }
        } catch (error) {
            console.log("Error while processing email queue: ", error);
        }

        if(logger) await logger.error(error);
    } finally {
        if(client){
            client.release();
        }
    }
})();

function classifyEmailError(error) {
    if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
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
    return EMAIL_ERROR_TYPES.UNKNOWN;
}

function shouldRetryError(errorType, attempts) {
    const RETRYABLE_ERRORS = [
        EMAIL_ERROR_TYPES.NETWORK,
        EMAIL_ERROR_TYPES.RATE_LIMIT,
        EMAIL_ERROR_TYPES.TIMEOUT,
        EMAIL_ERROR_TYPES.SMTP
    ];
    
    return RETRYABLE_ERRORS.includes(errorType) && attempts < MAX_ATTEMPTS;
}