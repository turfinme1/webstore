const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateBody } = require("../serverConfigurations/validation");

class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  register = async (req, res, next) => {
    ASSERT_USER(req.session.rate_limited_until <= Date.now(), "Too many failed attempts. Try again later", { code: "CONTROLLER.AUTH.00019.RATE_LIMITED", long_description: "Too many failed attempts. Try again later" });
    validateBody(req, req.entitySchemaCollection.userRegisterSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      context: req.context,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.register(data);
    res.status(200)
      .cookie("session_id", result.session_hash, { expires: result.expires_at, secure: false, httpOnly: false})
      .json({message: "Registration successful"});

    await req.logger.info({ code: "CONTROLLER.AUTH.00033.REGISTRATION_SUCCESS", short_description: "Registration successful", long_description: `User ${req.body.email} registered successfully` });
  }

  login = async (req, res, next) => {
    ASSERT_USER(req.session.rate_limited_until <= Date.now(), "Too many failed attempts. Try again later", { code: "CONTROLLER.AUTH.00037.RATE_LIMITED", long_description: "Too many failed attempts. Try again later" });
    validateBody(req, req.entitySchemaCollection.userLoginSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.login(data);
    req.session = result;
    res.status(200)
      .cookie("session_id", result.session_hash, { expires: result.expires_at, secure: false, httpOnly: false})
      .json({message: "Login successful"});
    
    await req.logger.info({ code: "CONTROLLER.AUTH.00051.LOGIN_SUCCESS", short_description: "Login successful", long_description: `User ${req.body.email} logged in successfully` });
  }

  logout = async (req, res, next) => {
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

  verifyMail = async (req, res, next) => {
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

  getStatus = async (req, res, next) => {
    const data = {
      cookies: req.cookies,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.getStatus(data);
    res.status(200).json(result);
  }

  getCaptcha = async (req, res, next) => {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const resultStream = await this.authService.getCaptcha(data);
    res.setHeader('Content-Type', 'image/png');
    await resultStream.pipe(res);
  }

  updateProfile = async (req, res, next) => {
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

    await req.logger.info({ code: "CONTROLLER.AUTH.00113.UPDATE_SUCCESS", short_description: "User profile update successful", long_description: `User ${req.session.session_hash} updated their profile successfully` });
  }

  forgotPassword = async (req, res, next) => {
    validateBody(req, req.entitySchemaCollection.userForgotPasswordSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      context: req.context,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.forgotPassword(data);
    res.status(200).json(result);
  }

  resetPassword = async (req, res, next) => {
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

    await req.logger.info({ code: "CONTROLLER.AUTH.00142.PASSWORD_RESET_SUCCESS", short_description: "User password reset successful", long_description: `User ${req.session.session_hash} reset their password successfully` });
  }

  getUserIdBySession = async (req, res, next) => {
    const data = {
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.getUserIdBySession(data);
    res.status(200).json(result);
  }
}

module.exports = AuthController;