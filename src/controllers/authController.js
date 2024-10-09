const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateBody } = require("../serverConfigurations/validation");
const STATUS_CODES = require("../serverConfigurations/constants");

class AuthController {
  constructor(authService) {
    this.authService = authService;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.verifyMail = this.verifyMail.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.getCaptcha = this.getCaptcha.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
  }

  async register(req, res, next) {
    ASSERT_USER(req.session.rate_limited_until <= Date.now(), "Too many failed attempts. Try again later", STATUS_CODES.RATE_LIMITED);
    validateBody(req, req.entitySchemaCollection.userRegisterSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.register(data);
    res.status(200)
      .cookie("session_id", result.session_hash, { expires: result.expires_at, secure: false, httpOnly: false})
      .json({message: "Registration successful"});

    await req.logger.info({ error_code: STATUS_CODES.REGISTRATION_SUCCESS, short_description: "Registration successful" });
  }

  async login(req, res, next) {
    ASSERT_USER(req.session.rate_limited_until <= Date.now(), "Too many failed attempts. Try again later", STATUS_CODES.RATE_LIMITED);
    validateBody(req, req.entitySchemaCollection.userLoginSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.login(data);
    res.status(200)
      .cookie("session_id", result.session_hash, { expires: result.expires_at, secure: false, httpOnly: false})
      .json({message: "Login successful"});
    
    await req.logger.info({ error_code: STATUS_CODES.LOGIN_SUCCESS, short_description: "Login successful" });
  }

  async logout(req, res, next) {
    const data = {
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.logout(data);
    res.status(200)
      .clearCookie("session_id", { expires: result.expires_at, secure: false, httpOnly: false})
      .json({message: "Logout successful"});
  }

  async verifyMail(req, res, next) {
    const data = {
      query : req.query,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.verifyMail(data);
    res.status(200).json(result);
  }

  async getStatus(req, res, next) {
    const data = {
      cookies: req.cookies,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.getStatus(data);
    res.status(200).json(result);
  }

  async getCaptcha(req, res, next) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const resultStream = await this.authService.getCaptcha(data);
    res.setHeader('Content-Type', 'image/png');
    await resultStream.pipe(res);
  }

  async updateProfile(req, res, next) {
    validateBody(req, req.entitySchemaCollection.userUpdateSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.updateProfile(data);
    res.status(200).json(result);

    await req.logger.info({ error_code: STATUS_CODES.PROFILE_UPDATE_SUCCESS, short_description: "User profile update successful" });
  }

  async forgotPassword(req, res, next) {
    validateBody(req, req.entitySchemaCollection.userForgotPasswordSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.forgotPassword(data);
    res.status(200).json(result);
  }

  async resetPassword(req, res, next) {
    validateBody(req, req.entitySchemaCollection.userResetPasswordSchema);
    const data = {
      body: req.body,
      query: req.query,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.resetPassword(data);
    res.status(200).json(result);

    await req.logger.info({ error_code: STATUS_CODES.PASSWORD_RESET_SUCCESS, short_description: "User password reset successful" });
  }
}

module.exports = AuthController;