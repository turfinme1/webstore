const { STATUS_CODES }  = require("../../serverConfigurations/constants");
const AuthController = require("../authController");

describe("AuthController", () => {
  let authController;
  let authService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      verifyMail: jest.fn(),
      getStatus: jest.fn(),
      getCaptcha: jest.fn(),
      updateProfile: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
    };

    authController = new AuthController(authService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe("register", () => {
    it("should validate request body, call authService.register, and respond with status 200", async () => {
      const req = {
        body: { email: "test@example.com" },
        entitySchemaCollection: { userRegisterSchema: {} },
        session: { rate_limited_until: Date.now() - 1000 }, 
        dbConnection: {},
        logger: { info: jest.fn() },
      };
      const registrationResult = {
        session_hash: "hash",
        expires_at: new Date(),
      };

      authService.register.mockResolvedValue(registrationResult);

      await authController.register(req, mockRes, mockNext);

      expect(authService.register).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.cookie).toHaveBeenCalledWith("session_id", registrationResult.session_hash, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Registration successful" });
      expect(req.logger.info).toHaveBeenCalledWith({
        code: STATUS_CODES.AUTH_REGISTRATION_SUCCESS,
        short_description: "Registration successful",
        long_description: `User ${req.body.email} registered successfully`,
      });
    });
  });

  describe("login", () => {
    it("should validate request body, call authService.login, and respond with status 200", async () => {
      const req = {
        body: { email: "test@example.com" },
        entitySchemaCollection: { userLoginSchema: {} },
        session: { rate_limited_until: Date.now() - 1000 },
        dbConnection: {},
        logger: { info: jest.fn() },
      };
      const loginResult = {
        session_hash: "hash",
        expires_at: new Date(),
      };

      authService.login.mockResolvedValue(loginResult);

      await authController.login(req, mockRes, mockNext);

      expect(authService.login).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.cookie).toHaveBeenCalledWith("session_id", loginResult.session_hash, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Login successful" });
      expect(req.logger.info).toHaveBeenCalledWith({ 
        code: STATUS_CODES.AUTH_LOGIN_SUCCESS,
        short_description: "Login successful",
        long_description: `User ${req.body.email} logged in successfully`
      });
    });
  });

  describe("logout", () => {
    it("should call authService.logout, clear cookie, and respond with status 200", async () => {
      const req = {
        params: {},
        session: {},
        dbConnection: {},
      };
      const logoutResult = { expires_at: new Date() };

      authService.logout.mockResolvedValue(logoutResult);

      await authController.logout(req, mockRes, mockNext);

      expect(authService.logout).toHaveBeenCalledWith({
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.clearCookie).toHaveBeenCalledWith("session_id", expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Logout successful" });
    });
  });

  describe("verifyMail", () => {
    it("should call authService.verifyMail and respond with status 200", async () => {
      const req = {
        query: { token: "verification-token" },
        params: {},
        session: {},
        dbConnection: {},
      };
      const verifyMailResult = { message: "Email verified" };

      authService.verifyMail.mockResolvedValue(verifyMailResult);

      await authController.verifyMail(req, mockRes, mockNext);

      expect(authService.verifyMail).toHaveBeenCalledWith({
        query: req.query,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(verifyMailResult);
    });
  });

  describe("getStatus", () => {
    it("should call authService.getStatus and respond with status 200", async () => {
      const req = {
        cookies: {},
        session: {},
        dbConnection: {},
      };
      const statusResult = { isAuthenticated: true };

      authService.getStatus.mockResolvedValue(statusResult);

      await authController.getStatus(req, mockRes, mockNext);

      expect(authService.getStatus).toHaveBeenCalledWith({
        cookies: req.cookies,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(statusResult);
    });
  });

  describe("getCaptcha", () => {
    it("should call authService.getCaptcha, set the correct headers, and pipe the result to the response", async () => {
      const req = {
        session: {},
        dbConnection: {},
      };
      
      const mockStream = {
        pipe: jest.fn(),
      };
  
      authService.getCaptcha.mockResolvedValue(mockStream);
  
      await authController.getCaptcha(req, mockRes, mockNext);
  
      expect(authService.getCaptcha).toHaveBeenCalledWith({
        session: req.session,
        dbConnection: req.dbConnection,
      });
  
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
  
      expect(mockStream.pipe).toHaveBeenCalledWith(mockRes);
    });
  });

  describe("updateProfile", () => {
    it("should validate request body, call authService.updateProfile, and respond with status 200", async () => {
      const req = {
        body: { name: "New Name" },
        entitySchemaCollection: { userUpdateSchema: {} },
        session: { session_hash: "hash" },
        dbConnection: {},
        params: {},
        logger: { info: jest.fn() },
      };
      const updateProfileResult = { success: true };
  
      authService.updateProfile.mockResolvedValue(updateProfileResult);
  
      await authController.updateProfile(req, mockRes, mockNext);
  
      expect(authService.updateProfile).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updateProfileResult);
      expect(req.logger.info).toHaveBeenCalledWith({ 
          code: STATUS_CODES.AUTH_PROFILE_UPDATE_SUCCESS, 
          short_description: "User profile update successful",
          long_description: `User ${req.session.session_hash} updated their profile successfully`
        });
    });
  });
  
  describe("forgotPassword", () => {
    it("should validate request body, call authService.forgotPassword, and respond with status 200", async () => {
      const req = {
        body: { email: "test@example.com" },
        entitySchemaCollection: { userForgotPasswordSchema: {} },
        session: {},
        dbConnection: {},
        params: {},
      };
      const forgotPasswordResult = { message: "Password reset link sent" };
  
      authService.forgotPassword.mockResolvedValue(forgotPasswordResult);
  
      await authController.forgotPassword(req, mockRes, mockNext);
  
      expect(authService.forgotPassword).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(forgotPasswordResult);
    });
  });
  
  describe("resetPassword", () => {
    it("should validate request body, call authService.resetPassword, and respond with status 200", async () => {
      const req = {
        body: { newPassword: "newpassword123" },
        entitySchemaCollection: { userResetPasswordSchema: {} },
        session: { session_hash: "hash" },
        dbConnection: {},
        params: { token: "reset-token" },
        query: {},
        logger: { info: jest.fn() },
      };
      const resetPasswordResult = { message: "Password reset successful" };
  
      authService.resetPassword.mockResolvedValue(resetPasswordResult);
  
      await authController.resetPassword(req, mockRes, mockNext);
  
      expect(authService.resetPassword).toHaveBeenCalledWith({
        body: req.body,
        query: req.query,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(resetPasswordResult);
      expect(req.logger.info).toHaveBeenCalledWith({ 
        code: STATUS_CODES.AUTH_PASSWORD_RESET_SUCCESS, 
        short_description: "User password reset successful", 
        long_description: `User ${req.session.session_hash} reset their password successfully`
      });
    });
  });
  
});