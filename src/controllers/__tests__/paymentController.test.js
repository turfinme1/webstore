const { validateBody } = require("../../serverConfigurations/validation");
const PaymentController = require("../paymentController");

jest.mock("../../serverConfigurations/validation");

describe("PaymentController", () => {
  let paymentController;
  let paymentService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    paymentService = {
      createPayment: jest.fn(),
    };

    paymentController = new PaymentController(paymentService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    validateBody.mockReset();
  });

  describe("createPayment", () => {
    it("should call paymentService.createPayment and respond with status 200", async () => {
      const req = {
        body: { amount: 100 },
        params: { id: 1 },
        session: { user_id: 1 },
        dbConnection: {},
        entitySchemaCollection: { paymentSchema: {} },
      };

      const result = { message: "Payment created successfully" };
      paymentService.createPayment.mockResolvedValue(result);

      await paymentController.createPayment(req, mockRes, mockNext);

      expect(validateBody).toHaveBeenCalledWith(req, req.entitySchemaCollection.paymentSchema);
      expect(paymentService.createPayment).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });
    
  });
});