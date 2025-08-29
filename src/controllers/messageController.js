const { ASSERT_USER } = require("../serverConfigurations/assert");

class MessageController {
  constructor(messageService) {
    this.messageService = messageService;
  }

  sendTestEmail = async (req, res, next) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action",{ code: "CONTROLLER.EMAIL.00011.EMAIL_UNAUTHORIZED", long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      context: req.context,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };
    const result = await this.messageService.sendTestEmail(data);
    res.status(200).json(result);
  }

  previewEmail = async (req, res, next) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action",{ code: "CONTROLLER.EMAIL.00024.EMAIL_UNAUTHORIZED", long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      context: req.context,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };
    const result = await this.messageService.previewEmail(data);
    res.status(200).json(result);
  }
}

module.exports = MessageController;
