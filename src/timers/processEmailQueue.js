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
const PUSH_MESSAGE_BROADCAST_TYPE = 'Push-Notification-Broadcast';

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
                WHERE type IN ($1, $2, $3)
                  AND status = $4
                  AND (email_last_attempt IS NULL OR email_last_attempt < NOW() - INTERVAL '${RETRY_DELAY_MINUTES} minutes')
                  AND email_attempts < $5
                  AND (email_retry_after IS NULL OR email_retry_after < NOW())
                ORDER BY email_priority DESC, created_at ASC
                LIMIT $6
                FOR UPDATE SKIP LOCKED
            )
            UPDATE emails
            SET status = $7,    
                email_processing_started_at = NOW()
            FROM cte
            WHERE emails.id = cte.id
            RETURNING emails.*;
        `, [MESSAGE_TYPE, PUSH_MESSAGE_TYPE, PUSH_MESSAGE_BROADCAST_TYPE, EMAIL_STATUS.PENDING, MAX_ATTEMPTS, BATCH_SIZE, EMAIL_STATUS.SENDING]);

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
                } else if (email.type === 'Push-Notification-Broadcast') {
                        const PUSH_NOTIFICATION_BATCH_SIZE = 10000;
                        const PUSH_CONCURRENT_REQUESTS = 100; 
                        
                        const countResult = await client.query(`
                            SELECT COUNT(*) as total FROM push_subscriptions
                        `);
                        
                        if (parseInt(countResult.rows[0].total) === 0) {
                            await client.query(`
                                UPDATE emails
                                SET status = $1
                                WHERE id = $2`,
                                [EMAIL_STATUS.FAILED, email.id]
                            );

                            await logger.info({
                                code: 'TIMERS.PROCESS_EMAIL_QUEUE.00005.NO_SUBSCRIPTIONS',
                                short_description: 'No push subscriptions found',
                                long_description: 'No push subscriptions available for broadcast'
                            });
                            
                            continue;
                        }
                        
                        // Process in batches
                        const totalSubscriptions = parseInt(countResult.rows[0].total);
                        const notificationPayload = JSON.stringify({ 
                            id: email.id, 
                            title: email.subject, 
                            body: email.text_content 
                        });
                        
                        let successCount = 0;
                        let failureCount = 0;
                        let offset = 0;
                        
                        // Process in batches until all subscriptions are processed
                        while (offset < totalSubscriptions) {
                            // Get a batch of subscriptions
                            const subscriptionsResult = await client.query(`
                                SELECT * FROM push_subscriptions
                                LIMIT $1 OFFSET $2`,
                                [PUSH_NOTIFICATION_BATCH_SIZE, offset]
                            );
                            
                            const subscriptions = subscriptionsResult.rows;
                            const batchResults = [];
                            
                            // Process the batch in chunks to control concurrency
                            for (let i = 0; i < subscriptions.length; i += PUSH_CONCURRENT_REQUESTS) {
                                const chunk = subscriptions.slice(i, i + PUSH_CONCURRENT_REQUESTS);
                                
                                // Send notifications concurrently but with limits
                                const promises = chunk.map(subscription => {
                                    return webpush.sendNotification(subscription.data, notificationPayload)
                                        .then(() => ({ success: true }))
                                        .catch(error => {
                                            // Log the error but don't fail the whole batch
                                            logger.error(error).catch(() => {}); // Ignore logging errors
                                            
                                            // If the subscription is gone, we should remove it
                                            if (error.statusCode === 410) {
                                                return {
                                                    success: false,
                                                    expired: true,
                                                    subscriptionId: subscription.id
                                                };
                                            }
                                            
                                            return { success: false };
                                        });
                                });
                                
                                // Wait for all promises in this chunk to resolve
                                const chunkResults = await Promise.all(promises);
                                batchResults.push(...chunkResults);
                                
                                // Short pause between chunks to prevent overwhelming servers
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            
                            // Process results of this batch
                            const batchSuccessCount = batchResults.filter(r => r.success).length;
                            const batchFailureCount = batchResults.length - batchSuccessCount;
                            
                            successCount += batchSuccessCount;
                            failureCount += batchFailureCount;
                            
                            // Clean up expired subscriptions
                            const expiredSubscriptions = batchResults
                                .filter(r => r.expired && r.subscriptionId)
                                .map(r => r.subscriptionId);
                                
                            if (expiredSubscriptions.length > 0) {
                                await client.query(`
                                    DELETE FROM push_subscriptions
                                    WHERE id = ANY($1)
                                `, [expiredSubscriptions]);
                                
                                await logger.info({
                                    code: 'TIMERS.PROCESS_EMAIL_QUEUE.00012.REMOVED_EXPIRED_SUBSCRIPTIONS',
                                    short_description: 'Removed expired push subscriptions',
                                    long_description: `Removed ${expiredSubscriptions.length} expired push subscriptions`
                                });
                            }
                            
                            // Move to next batch
                            offset += PUSH_NOTIFICATION_BATCH_SIZE;
                        }
                        
                        const successRate = totalSubscriptions > 0 ? (successCount / totalSubscriptions) : 0;
                        
                        await client.query(`
                            UPDATE emails 
                            SET status = $1, sent_at = NOW()
                            WHERE id = $2`, 
                            [EMAIL_STATUS.SENT, email.id]
                        );
                        
                        await logger.info({
                            code: 'TIMERS.PROCESS_EMAIL_QUEUE.00014.PUSH_BROADCAST_COMPLETED',
                            short_description: 'Push notification broadcast completed',
                            long_description: `Sent push notifications to ${successCount} of ${totalSubscriptions} subscribers (${(successRate * 100).toFixed(2)}%)`
                        });
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