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
            `INSERT INTO push_subscriptions (data, user_id, ip, user_agent) VALUES ($1, $2, $3, $4)`,
            [data.body, data.session.user_id, data.ip, data.userAgent]
        );
    }
    
    async sendPushNotification(data) {
        const subscriptions = await data.dbConnection.query(
            `SELECT * FROM push_subscriptions`,
        );
        webpush.setVapidDetails(
            ENV.VAPID_MAILTO,
            ENV.VAPID_PUBLIC_KEY,
            ENV.VAPID_PRIVATE_KEY,
        );
        for (const subscription of subscriptions.rows) {
            await webpush.sendNotification(subscription.data, JSON.stringify({ title: "New Notification", body: "<p>Hello, {first_name} {last_name}! You have a new notification. Your email is {email} and your phone number is {phone}</p>" }));
        }
    }

    async deletePushSubscription(data) {
        await data.dbConnection.query(
            `DELETE FROM push_subscriptions WHERE user_id = $1`,
            [data.session.user_id]
        );
    }
}

module.exports = NotificationService;