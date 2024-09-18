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
        session: {},
        dbConnection: {},
      };
      const registrationResult = {
        session_hash: "hash",
        expires_at: new Date(),
      };

      authService.register.mockResolvedValue(registrationResult);

      await authController.register(req, mockRes, mockNext);

      expect(authService.register).toHaveBeenCalledWith({
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.cookie).toHaveBeenCalledWith("session_id", registrationResult.session_hash, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Registration successful" });
    });
  });

  describe("login", () => {
    it("should validate request body, call authService.login, and respond with status 200", async () => {
      const req = {
        body: { email: "test@example.com" },
        entitySchemaCollection: { userLoginSchema: {} },
        session: {},
        dbConnection: {},
      };
      const loginResult = {
        session_hash: "hash",
        expires_at: new Date(),
      };

      authService.login.mockResolvedValue(loginResult);

      await authController.login(req, mockRes, mockNext);

      expect(authService.login).toHaveBeenCalledWith({
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.cookie).toHaveBeenCalledWith("session_id", loginResult.session_hash, expect.any(Object));
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Login successful" });
    });
  });

  describe("logout", () => {
    it("should call authService.logout, clear cookie, and respond with status 200", async () => {
      const req = {
        session: {},
        dbConnection: {},
      };
      const logoutResult = { expires_at: new Date() };

      authService.logout.mockResolvedValue(logoutResult);

      await authController.logout(req, mockRes, mockNext);

      expect(authService.logout).toHaveBeenCalledWith({
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
        session: {},
        dbConnection: {},
      };
      const verifyMailResult = { message: "Email verified" };

      authService.verifyMail.mockResolvedValue(verifyMailResult);

      await authController.verifyMail(req, mockRes, mockNext);

      expect(authService.verifyMail).toHaveBeenCalledWith({
        query: req.query,
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
});