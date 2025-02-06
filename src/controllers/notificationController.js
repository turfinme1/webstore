const { ASSERT_USER } = require("../serverConfigurations/assert");

class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.getNotificationByUserId = this.getNotificationByUserId.bind(this);
        this.markAsRead = this.markAsRead.bind(this);
    }

    async getNotificationByUserId(req, res) {
        ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.NOTIFICATION.00001.UNAUTHORIZED_GET_NOTIFICATION", long_description: "You must be logged in to perform this action" });
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
        };
        const result = await this.notificationService.getNotificationByUserId(data);
        res.status(200).json(result);
    }

    async markAsRead(req, res) {
        ASSERT_USER(req.session.user_id, "You must be logged in", { code: "CONTROLLER.NOTIFICATION.00002.UNAUTHORIZED_MARK_READ", long_description: "User must be logged in to mark notifications as read" });
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
            params: req.params
        };
        await this.notificationService.markAsRead(data);
        res.status(200).end();
    }
}

module.exports = NotificationController;