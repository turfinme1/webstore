const STATUS_CODES = require("../serverConfigurations/constants");
const { ASSERT_USER } = require("../serverConfigurations/assert");

class EmailController {
  constructor(mailService, crudService) {
    this.mailService = mailService;
    this.crudService = crudService;
    this.getEmailTemplates = this.getEmailTemplates.bind(this);
  }

  async updateEmailTemplate(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action",{ code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };
    const result = await this.crudService.update(data);
    res.status(200).json(result);

    await req.logger.info({
      code: STATUS_CODES.UPDATE_SUCCESS,
      short_description: `Updated ${data.params.entity}`,
      long_description: `Updated ${data.params.entity} with id ${result.id}`,
    });
  }
}

module.exports = EmailController;
