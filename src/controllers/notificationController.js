const { ASSERT_USER } = require("../serverConfigurations/assert");

class NotificationController {
    constructor(notificationService) {
        this.notificationService = notificationService;
    }

    getNotificationByUserId = async (req, res) => {
        ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.NOTIFICATION.00001.UNAUTHORIZED_GET_NOTIFICATION", long_description: "You must be logged in to perform this action" });
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
        };
        const result = await this.notificationService.getNotificationByUserId(data);
        res.status(200).json(result);
    }

    markAsRead = async (req, res) => {
        const data = {
            session: req.session,
            dbConnection: req.dbConnection,
            params: req.params
        };
        await this.notificationService.markAsRead(data);
        res.status(200).end();
    }

    createSubscription = async (req, res) => {
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

    deleteSubscription = async (req, res) => {
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