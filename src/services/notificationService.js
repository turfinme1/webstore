const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");
const webpush = require("web-push");
const { ENV } = require("../serverConfigurations/constants");

class NotificationService {
    constructor(){
    }
    
    async getNotificationByUserId(data){
        ASSERT_USER(data.session.user_id, "You must be logged in to perform this action", { code: "SERVICE.NOTIFICATION.00001.UNAUTHORIZED_GET_NOTIFICATION", long_description: "You must be logged in to perform this action" });
        const allUserNotifications = await data.dbConnection.query(
            `SELECT * FROM emails WHERE recipient_id = $1 AND type = 'Notification' ORDER BY created_at DESC`,
            [data.session.user_id]
        );

        const updatedNotifications = await data.dbConnection.query(
            `UPDATE emails SET status = 'sent' WHERE recipient_id = $1 AND type = 'Notification' AND status IN ('pending')`,
            [data.session.user_id]
        );

        return allUserNotifications.rows;
    }

    async markAsRead(data) {
        ASSERT_USER(data.session.user_id, "You must be logged in", { 
            code: "SERVICE.NOTIFICATION.00002.UNAUTHORIZED_MARK_READ", 
            long_description: "User must be logged in to mark notifications as read" 
        });

        await data.dbConnection.query(
            `UPDATE emails 
             SET status = 'seen' 
             WHERE id = $1 AND recipient_id = $2`,
            [data.params.id, data.session.user_id]
        );
    }

    async createPushSubscription(data) {
        await data.dbConnection.query(
            `INSERT INTO push_subscriptions (endpoint, data, user_id, ip, user_agent) VALUES ($1, $2, $3, $4, $5) 
            ON CONFLICT (endpoint) DO UPDATE SET data = $2, user_id = $3, ip = $4, user_agent = $5`,
            [data.body.endpoint, data.body, data.session.user_id, data.ip, data.userAgent]
        );
    }

    async deletePushSubscription(data) {
        await data.dbConnection.query(
            `DELETE FROM push_subscriptions WHERE endpoint = $1`,
            [data.body.endpoint]
        );
    }
}

module.exports = NotificationService;