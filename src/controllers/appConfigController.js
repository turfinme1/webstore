const { ASSERT_USER } = require("../serverConfigurations/assert");
const { ENV } = require("../serverConfigurations/constants");
const { validateBody } = require("../serverConfigurations/validation");

class AppConfigController {
  constructor(appConfigService, authService) {
    this.appConfigService = appConfigService;
    this.authService = authService;
    this.updateRateLimitSettings = this.updateRateLimitSettings.bind(this);
    this.getRateLimitSettings = this.getRateLimitSettings.bind(this);
    this.getJavaAPIUrl = this.getJavaAPIUrl.bind(this);
  }

  async updateRateLimitSettings(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.APP_CONF.00013.UNAUTHORIZED", long_description: "You must be logged in to perform this action" });
    validateBody(req, req.entitySchemaCollection.appSettingsSchema);
    this.authService.requirePermission(req, "update", 'site-settings');
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
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.APP_CONF.00027.UNAUTHORIZED", long_description: "You must be logged in to perform this action" });
    const data = {
      dbConnection: req.dbConnection,
    };
    const result = await this.appConfigService.getRateLimitSettings(data);
    res.status(200).json(result);
  }

  async getJavaAPIUrl(req, res, next) {
    res.status(200).json({ url: ENV.JAVA_API_URL });
  }
}

module.exports = AppConfigController;