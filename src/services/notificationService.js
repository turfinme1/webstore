const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");
const { ENV } = require("../serverConfigurations/constants");

class NotificationService {
    constructor(){
    }
    
    async getNotificationByUserId(data){
        ASSERT_USER(data.session.user_id, "You must be logged in to perform this action", { code: "SERVICE.NOTIFICATION.00001.UNAUTHORIZED_GET_NOTIFICATION", long_description: "You must be logged in to perform this action" });
        const allUserNotifications = await data.dbConnection.query(
            `SELECT * FROM message_queue WHERE recipient_id = $1 AND type = 'Notification' AND status IN ('pending', 'sent', 'seen') AND event_type = 'notification' ORDER BY created_at DESC LIMIT 50`,
            [data.session.user_id]
        );

        return allUserNotifications.rows;
    }

    async updateNotificationStatus(data) {
        await data.dbConnection.query(
            `UPDATE message_queue 
             SET status = $1
             WHERE id = $2`,
            [data.body.status, data.params.id]
        );
    }

    async createSubscription(data) {
        let platform = "unknown";
        if (data.userAgent.includes("Android")) {
            platform = "android";
        } else if (data.userAgent.includes("iOS") || data.userAgent.includes("iPhone") || data.userAgent.includes("iPad")) {
            platform = "ios";
        } else if (data.userAgent.includes("Windows")) {
            platform = "windows";
        } else if (data.userAgent.includes("Linux")) {
            platform = "linux";
        }
        await data.dbConnection.query(
            `INSERT INTO push_subscriptions (endpoint, data, user_id, ip, user_agent, status, platform) VALUES ($1, $2, $3, $4, $5, $6, $7) 
            ON CONFLICT (endpoint) DO UPDATE SET data = $2, user_id = $3, ip = $4, user_agent = $5, status = $6, platform = $7`,
            [data.body.endpoint, data.body, data.session.user_id, data.ip, data.userAgent, data.body.status || 'active', platform]
        );
    }

    async deleteSubscription(data) {
        await data.dbConnection.query(
            `UPDATE push_subscriptions SET status = 'inactive' WHERE endpoint = $1`,
            [data.body.endpoint]
        );
    }
}

module.exports = NotificationService;