const { ASSERT_USER } = require("../serverConfigurations/assert");

class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
        this.getNotificationByUserId = this.getNotificationByUserId.bind(this);
        this.markAsRead = this.markAsRead.bind(this);
        this.createSubscription = this.createSubscription.bind(this);
        this.deleteSubscription = this.deleteSubscription.bind(this);
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
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
            params: req.params
        };
        await this.notificationService.markAsRead(data);
        res.status(200).end();
    }

    async createSubscription(req, res) {
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
            body: req.body,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
        };
        await this.notificationService.createSubscription(data);
        res.status(200).end();
    }

    async deleteSubscription(req, res) {
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
            body: req.body,
        };
        await this.notificationService.deleteSubscription(data);
        res.status(200).end();
    }
}

module.exports = NotificationController;