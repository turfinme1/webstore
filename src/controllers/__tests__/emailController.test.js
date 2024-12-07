const { ASSERT_USER } = require("../../serverConfigurations/assert");
const { STATUS_CODES } = require("../../serverConfigurations/constants");
const EmailController = require("../emailController");

jest.mock("../../serverConfigurations/assert");

describe("EmailController", () => {
  let emailController;
  let emailService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    emailService = {
      sendTestEmail: jest.fn(),
      previewEmail: jest.fn(),
    };

    emailController = new EmailController(emailService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    ASSERT_USER.mockReset();
  });

  describe("sendTestEmail", () => {
    it("should call emailService.sendTestEmail and respond with status 200", async () => {
      const req = {
        body: { email: "test@example.com" },
        params: {},
        session: { admin_user_id: 1 }, // Admin user is logged in
        dbConnection: {},
        entitySchemaCollection: {},
      };
      const sendResult = { success: true };

      emailService.sendTestEmail.mockResolvedValue(sendResult);

      await emailController.sendTestEmail(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.admin_user_id,
        "You must be logged in to perform this action",
        { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" }
      );
      expect(emailService.sendTestEmail).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(sendResult);
    });
  });

  describe("previewEmail", () => {
    it("should call emailService.previewEmail and respond with status 200", async () => {
      const req = {
        body: { email: "test@example.com" },
        params: {},
        session: { admin_user_id: 1 }, // Admin user is logged in
        dbConnection: {},
        entitySchemaCollection: {},
      };
      const previewResult = { success: true };

      emailService.previewEmail.mockResolvedValue(previewResult);

      await emailController.previewEmail(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.admin_user_id,
        "You must be logged in to perform this action",
        { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" }
      );
      expect(emailService.previewEmail).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(previewResult);
    });
  });
});