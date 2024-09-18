const { validateBody } = require("../serverConfigurations/validation");

class AuthController {
  constructor(authService) {
    this.authService = authService;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.verifyMail = this.verifyMail.bind(this);
    this.getStatus = this.getStatus.bind(this);
    this.getCaptcha = this.getCaptcha.bind(this);
  }

  async register(req, res, next) {
    validateBody(req, req.entitySchemaCollection.userRegisterSchema);
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.register(data);
    res.status(200)
      .cookie("session_id", result.session_hash, { expires: result.expires_at, secure: true, httpOnly: true})
      .json({message: "Registration successful"});
  }

  async login(req, res, next) {
    validateBody(req, req.entitySchemaCollection.userLoginSchema);
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.authService.login(data);
    res.status(200)
      .cookie("session_id", result.session_hash, { expires: result.expires_at, secure: true, httpOnly: true})
      .json({message: "Login successful"});
  }

  async logout(req, res, next) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    }; 
    const result = await this.authService.logout(data);
    res.status(200)
      .clearCookie("session_id", { expires: result.expires_at, secure: true, httpOnly: true})
      .json({message: "Logout successful"});
  }

  async verifyMail(req, res, next) {
    const data = {
      query : req.query,
      session: req.session,
      dbConnection: req.dbConnection,
    }; 
    const result = await this.authService.verifyMail(data);
    res.status(200).json(result);
  }

  async getStatus(req, res, next) {
    const data = {
      cookies: req.cookies,
      session: req.session,
      dbConnection: req.dbConnection,
    }; 
    const result = await this.authService.getStatus(data);
    res.status(200).json(result);
  }

  async getCaptcha(req, res, next) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    }; 
    const resultStream = await this.authService.getCaptcha(data);
    res.setHeader('Content-Type', 'image/png');
    await resultStream.pipe(res);
  }
}

module.exports = AuthController;