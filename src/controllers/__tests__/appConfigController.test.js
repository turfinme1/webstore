const { ASSERT_USER } = require("../../serverConfigurations/assert");
const { validateBody } = require("../../serverConfigurations/validation");
const AppConfigController = require("../appConfigController");

jest.mock("../../serverConfigurations/assert");
jest.mock("../../serverConfigurations/validation");

describe("AppConfigController", () => {
  let appConfigController;
  let appConfigService;
  let authService;
  let mockRes;
  let mockNext;
  let ERROR_CODE = 2;

  beforeEach(() => {
    // Mock the service layer
    appConfigService = {
      updateRateLimitSettings: jest.fn(),
      getRateLimitSettings: jest.fn(),
    };

    authService = {
      requirePermission: jest.fn(),
    };

    // Initialize the controller with the mocked service
    appConfigController = new AppConfigController(appConfigService, authService);

    // Mock response and next functions
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Reset mocks before each test
    ASSERT_USER.mockReset();
    validateBody.mockReset();
  });

  describe("updateRateLimitSettings", () => {
    it("should validate the request body, call appConfigService.updateRateLimitSettings, and respond with status 200", async () => {
      const req = {
        body: { request_limit: 1000 },
        session: { admin_user_id: 1 }, // Admin user is logged in
        entitySchemaCollection: { appSettingsSchema: {} },
        dbConnection: {},
      };
      const updateResult = { success: true };

      // Mock the service result and body validation
      appConfigService.updateRateLimitSettings.mockResolvedValue(updateResult);
      validateBody.mockImplementation(() => {}); // Mock validateBody to do nothing

      await appConfigController.updateRateLimitSettings(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.admin_user_id,
        "You must be logged in to perform this action", 
        { code:ERROR_CODE, long_description: "You must be logged in to perform this action" }
      );
      expect(validateBody).toHaveBeenCalledWith(
        req,
        req.entitySchemaCollection.appSettingsSchema
      );
      expect(appConfigService.updateRateLimitSettings).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updateResult);
    });
  });

  describe("getRateLimitSettings", () => {
    it("should call appConfigService.getRateLimitSettings and respond with status 200", async () => {
      const req = {
        session: { admin_user_id: 1 }, // Admin user is logged in
        dbConnection: {},
      };
      const getResult = { request_limit: 1000, request_window: 60 };

      // Mock the service result
      appConfigService.getRateLimitSettings.mockResolvedValue(getResult);

      await appConfigController.getRateLimitSettings(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.admin_user_id,
        "You must be logged in to perform this action" , 
        { code:ERROR_CODE, long_description: "You must be logged in to perform this action" }
      );
      expect(appConfigService.getRateLimitSettings).toHaveBeenCalledWith({
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(getResult);
    });
  });
});
