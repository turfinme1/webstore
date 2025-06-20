const webpush = require("../serverConfigurations/webpushWrapper");
const pool = require("../database/dbConfig");
const { MessageService, transporter } = require("../services/messageService");
const { TemplateLoader } = require("../serverConfigurations/templateLoader");
const Logger = require("../serverConfigurations/logger");
const { ENV } = require("../serverConfigurations/constants");
const { ASSERT } = require("../serverConfigurations/assert");
const { hrtime } = require("process");
const WebSocketModule = require("../serverConfigurations/webSocketModule");

const isDryRun = process.env.DRY_RUN === 'true';

const BATCH_SIZE = 1;
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

const MESSAGE_HANDLER = {
    "Email": handleEmailMessage,
    "Push-Notification": handlePushMessage,
    "Push-Notification-Broadcast": handlePushBroadcastMessage,
    "Notification": handleInAppMessage,
};

(async () => {
    let client;
    let logger;

    try {
        const start = hrtime();
        const templateLoader = new TemplateLoader();
        const messageService = new MessageService(transporter, templateLoader);
        
        client = await pool.connect();
        logger = new Logger({ dbConnection: client });
        webpush.setVapidDetails(
            ENV.VAPID_MAILTO,
            ENV.VAPID_PUBLIC_KEY,
            ENV.VAPID_PRIVATE_KEY,
        );

        await client.query('BEGIN');
        const settings = await client.query(`SELECT * FROM app_settings LIMIT 1`);
        ASSERT(settings.rows.length === 1, 'App settings not found', { code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00001.APP_SETTINGS_NOT_FOUND', long_description: 'App settings not found' });
        const pendingMessages = await client.query(`
            WITH cte AS (
                SELECT id
                FROM message_queue
                WHERE type IN ($1, $2, $3, $4)
                  AND status = $5
                  AND (email_last_attempt IS NULL OR email_last_attempt < NOW() - INTERVAL '${RETRY_DELAY_MINUTES} minutes')
                  AND email_attempts < $6
                  AND (email_retry_after IS NULL OR email_retry_after < NOW())
                ORDER BY email_priority DESC, created_at DESC
                LIMIT $7
                FOR UPDATE SKIP LOCKED
            )
            UPDATE message_queue
            SET status = $8,    
                email_processing_started_at = NOW()
            FROM cte
            WHERE message_queue.id = cte.id
            RETURNING message_queue.*;`,
            [EMAIL_MESSAGE_TYPE, PUSH_MESSAGE_TYPE, PUSH_MESSAGE_BROADCAST_TYPE, IN_APP_MESSAGE_TYPE, MESSAGE_STATUS.PENDING, MAX_ATTEMPTS, BATCH_SIZE, MESSAGE_STATUS.SENDING]);
        // await client.query(`COMMIT`);

        const processResult = await Promise.all(
            pendingMessages.rows.map(async (message) => 
                processMessage(message, client, logger, messageService, settings.rows[0])
            )
        )

        await client.query('BEGIN');
        await client.query(`
            UPDATE message_queue
            SET status = $1,
                email_retry_after = NOW() + (INTERVAL '1 minute' * $2)
            WHERE email_processing_started_at < NOW() - INTERVAL '10 minutes'
            AND status = $3`,
            [MESSAGE_STATUS.PENDING, RETRY_BACKOFF.INITIAL_DELAY, MESSAGE_STATUS.SENDING]);
        // await client.query('COMMIT');

        const end = hrtime(start);
        const elapsedTime = (end[0] * 1e9 + end[1]) / 1e6;
        console.log(`Message queue process completed in ${elapsedTime} ms`);
        await logger.info({
            code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00017.EMAIL_QUEUE_PROCESS_SUCCESS',
            short_description: 'Message queue process completed',
            long_description: 'Message queue process completed'
        });
    } catch (error) {
        console.log(error);
        if (client) await client.query('ROLLBACK');
        if (logger) await logger.error(error);
    } finally {
        if (client) {
            client.release();
        }
    }
})();

async function processMessage(message, client, logger, messageService, settings) {
    const messageHandler = MESSAGE_HANDLER[message.type];
    ASSERT(messageHandler, 'Message type not supported', { code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00036.MESSAGE_TYPE_NOT_SUPPORTED', long_description: `Message type ${message.type} not supported` });

    try {
        const { success } = await messageHandler(message, client, logger, messageService, settings);
        
        if(success) {
            await client.query(`
                UPDATE message_queue 
                SET status = $1, sent_at = NOW()
                WHERE id = $2`, 
                [MESSAGE_STATUS.SENT, message.id]
            );
            return { id: message.id, success: true };
        }
        
        return { id: message.id, success: false };
    } catch (error) {
        console.log(error);
        const { shouldRetry, errorType } = classifyEmailError(error);
        const retryDelay = calculateRetryDelay(message.email_attempts + 1);
        error.params = { 
            code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00010.SENDING_FAILED', 
            long_description: errorType 
        };
        
        const maxAttemptsReached = message.email_attempts + 1 >= MAX_ATTEMPTS;
        const newStatus = (shouldRetry && !maxAttemptsReached) ? MESSAGE_STATUS.PENDING : MESSAGE_STATUS.FAILED;
        
        await client.query(`
            UPDATE message_queue 
            SET status = $1,
                email_attempts = email_attempts + 1,
                email_last_attempt = NOW(),
                email_retry_after = NOW() + (INTERVAL '1 minute' * $2),
                email_priority = GREATEST(email_priority - 1, 1)
            WHERE id = $3
        `, [newStatus, retryDelay, message.id]);

        if(errorType === EMAIL_ERROR_TYPES.SUBSCRIPTION_NOT_FOUND && message.push_subscription_id) {
            await client.query(`
                UPDATE push_subscriptions
                SET status = $1
                WHERE id = $2`,
                [NOTIFICATION_STATUS.INACTIVE, message.push_subscription_id]
            );
        }

        await logger.error(error);
        return { id: message.id, success: false, errorType };
    }
}

async function handleEmailMessage(message, client, logger, messageService, settings) {
    const emailOptions = { 
        from: "no-reply@web-store4eto.com",
        to: message.recipient_email,
        subject: message.subject,
        html: message.text_content
    };
    await messageService.sendEmail(emailOptions);
    return { id: message.id, success: true };
}

async function handlePushMessage(message, client, logger, messageService, settings) {
    const subscriptions = await client.query(`
        SELECT * FROM push_subscriptions
        WHERE user_id = $1 AND status = $2`,
        [message.recipient_id, NOTIFICATION_STATUS.ACTIVE]
    );

    if(subscriptions.rows.length === 0) {
        await client.query(`
            UPDATE message_queue
            SET status = $1
            WHERE id = $2`,
            [MESSAGE_STATUS.FAILED, message.id]
        );

        await logger.info({
            code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00005.NO_SUBSCRIPTIONS',
            short_description: 'No push subscriptions found',
            long_description: 'No push subscriptions found',
        });

        return { id: message.id, success: false };
    }

    let sendNotificationCount = 0;
    for (const subscription of subscriptions.rows) {
        try {
            await webpush.sendNotification(subscription.data, JSON.stringify({
                id: message.id,
                title: message.subject,
                body: message.text_content, 
                ...message.notification_settings,
            }), { 
                TTL: message.notification_settings.TTL, 
                urgency: message.notification_settings.urgency, 
                topic: message.notification_settings.topic,
            });
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
            UPDATE message_queue
            SET status = $1
            WHERE id = $2`,
            [MESSAGE_STATUS.FAILED, message.id]
        );
        return { id: message.id, success: false };
    }
    
    return { id: message.id, success: true };
}

async function handlePushBroadcastMessage(message, client, logger, messageService, settings) {
    const subscription = await client.query(`
        SELECT * FROM push_subscriptions
        WHERE id = $1 AND status = $2`,
        [message.push_subscription_id, NOTIFICATION_STATUS.ACTIVE]
    );
    ASSERT(subscription.rows.length <= 1, 'Expected exactly one subscription for broadcast', { code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00017.EXPECTED_ONE_SUBSCRIPTION', long_description: `Expected exactly one subscription for broadcast with email id: ${message.id}` });

    if (subscription.rows.length === 0) {
        await client.query(`
            UPDATE message_queue
            SET status = $1
            WHERE id = $2`,
            [MESSAGE_STATUS.FAILED, message.id]
        );
        await logger.info({
            code: 'TIMERS.PROCESS_MESSAGE_QUEUE.00006.NO_SUBSCRIPTIONS',
            short_description: 'No push subscriptions found',
            long_description: 'No push subscriptions available for broadcast'
        });
        return { id: message.id, success: false };
    }

    const pushSubscription = subscription.rows[0];

    await webpush.sendNotification(pushSubscription.data, JSON.stringify({
                id: message.id,
                title: message.subject,
                body: message.text_content, 
                ...message.notification_settings,
            }), { 
                TTL: message.notification_settings.TTL, 
                urgency: message.notification_settings.urgency, 
                topic: message.notification_settings.topic,
            });
    return { id: message.id, success: true };
}

async function handleInAppMessage(message, client, logger, messageService, settings) {
    const expirationUpdateResult = await client.query(`
        UPDATE message_queue e
            SET status = $1
        FROM notifications n
        WHERE e.id = $2
            AND e.notification_id = n.id
            AND e.type = 'Notification'
            AND n.valid_to_timestamp < NOW()
        RETURNING e.id;`,
        [MESSAGE_STATUS.EXPIRED, message.id]
    );
    if (expirationUpdateResult.rows.length > 0) {
        return { id: message.id, success: false };
    }

    if (isDryRun) {
        console.log(
            `[processEmailQueue] request payload: ${JSON.stringify({
            method: "POST",
            url: `${settings.web_socket_api_url}/message`,
            body: {
                type: message.event_type,
                user_id: message.recipient_id,
                payload: {
                id: message.id,
                title: message.subject,
                body: message.text_content,
                },
            },
            })}`
        );

        return { id: message.id, success: true };
    }

    const result = await fetch(`${settings.web_socket_api_url}/message`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            type: WebSocketModule.MESSAGE_TYPES.EVENT,
            payload: {
                id: message.id,
                title: message.subject,
                type: message.event_type,
                body: message.text_content,
                user_id: message.recipient_id,
            },
        }),
    });

    if (result.status === 404) {
        await client.query(`
            UPDATE message_queue
            SET status = $1
            WHERE id = $2`,
            [MESSAGE_STATUS.PENDING, message.id]
        );
        return { id: message.id, success: false };
    } else if (result.status === 400) {
        await client.query(`
            UPDATE message_queue
            SET status = $1
            WHERE id = $2`,
            [MESSAGE_STATUS.FAILED, message.id]
        );
        return { id: message.id, success: false };
    } else if (result.status === 500) {
        const retryDelay = calculateRetryDelay(message.email_attempts + 1);
        await client.query(`
            UPDATE message_queue
            SET status = $1,
                email_attempts = email_attempts + 1,
                email_last_attempt = NOW(),
                email_retry_after = NOW() + (INTERVAL '1 minute' * $2),
                email_priority = GREATEST(email_priority - 1, 1)
            WHERE id = $3`,
            [MESSAGE_STATUS.PENDING, retryDelay, message.id]
        );
        return { id: message.id, success: false };
    }

    return { id: message.id, success: true };
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