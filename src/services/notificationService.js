const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");

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
}

module.exports = NotificationService;