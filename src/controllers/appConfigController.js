const STATUS_CODES = require("../serverConfigurations/constants");
const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateBody } = require("../serverConfigurations/validation");

class AppConfigController {
  constructor(appConfigService) {
    this.appConfigService = appConfigService;
    this.updateRateLimitSettings = this.updateRateLimitSettings.bind(this);
    this.getRateLimitSettings = this.getRateLimitSettings.bind(this);
  }

  async updateRateLimitSettings(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    validateBody(req, req.entitySchemaCollection.appSettingsSchema);
    
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.appConfigService.updateRateLimitSettings(data);
    res.status(200).json(result);
  }

  async getRateLimitSettings(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      dbConnection: req.dbConnection,
    };
    const result = await this.appConfigService.getRateLimitSettings(data);
    res.status(200).json(result);
  }
}

module.exports = AppConfigController;