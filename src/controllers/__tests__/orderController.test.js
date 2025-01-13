const { ASSERT_USER } = require("../../serverConfigurations/assert");
const OrderController = require("../orderController");

jest.mock("../../serverConfigurations/assert");

describe("OrderController", () => {
  let orderController;
  let orderService;
  let authService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    orderService = {
      createOrder: jest.fn(),
      createOrderByStaff: jest.fn(),
      updateOrderByStaff: jest.fn(),
      getOrder: jest.fn(),
      capturePaypalPayment: jest.fn(),
      cancelPaypalPayment: jest.fn(),
      deleteOrder: jest.fn(),
    };

    authService = {
      requirePermission: jest.fn(),
    };

    orderController = new OrderController(orderService, authService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      redirect: jest.fn(),
    };
    mockNext = jest.fn();

    ASSERT_USER.mockReset();
  });

  describe("createOrder", () => {
    it("should call orderService.createOrder and respond with status 201", async () => {
      const req = {
        body: { productId: 1 },
        session: { user_id: 1 },
        dbConnection: {},
      };
      const createResult = { success: true };

      orderService.createOrder.mockResolvedValue(createResult);

      await orderController.createOrder(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" }
      );
      expect(orderService.createOrder).toHaveBeenCalledWith({
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createResult);
    });
  });

  describe("createOrderByStaff", () => {
    it("should call orderService.createOrderByStaff and respond with status 201", async () => {
      const req = {
        body: { productId: 1 },
        session: { admin_user_id: 1 },
        dbConnection: {},
      };
      const createResult = { success: true };

      orderService.createOrderByStaff.mockResolvedValue(createResult);

      await orderController.createOrderByStaff(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.admin_user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" }
      );
      expect(authService.requirePermission).toHaveBeenCalledWith(req, "create", "orders");
      expect(orderService.createOrderByStaff).toHaveBeenCalledWith({
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(createResult);
    });
  });

  describe("updateOrderByStaff", () => {
    it("should call orderService.updateOrderByStaff and respond with status 201", async () => {
      const req = {
        body: { productId: 1 },
        params: { orderId: 1 },
        session: { admin_user_id: 1 },
        dbConnection: {},
      };
      const updateResult = { success: true };

      orderService.updateOrderByStaff.mockResolvedValue(updateResult);

      await orderController.updateOrderByStaff(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.admin_user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_UPDATE", long_description: "You must be logged in to perform this action" }
      );
      expect(authService.requirePermission).toHaveBeenCalledWith(req, "update", "orders");
      expect(orderService.updateOrderByStaff).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(updateResult);
    });
  });

  describe("getOrder", () => {
    it("should call orderService.getOrder and respond with status 200", async () => {
      const req = {
        params: { orderId: 1 },
        session: { user_id: 1 },
        dbConnection: {},
      };
      const getResult = { success: true };

      orderService.getOrder.mockResolvedValue(getResult);

      await orderController.getOrder(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_READ", long_description: "You must be logged in to perform this action" }
      );
      expect(orderService.getOrder).toHaveBeenCalledWith({
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(getResult);
    });
  });

  describe("capturePaypalPayment", () => {
    it("should call orderService.capturePaypalPayment and redirect to order-complete", async () => {
      const req = {
        body: { paymentId: "PAY-123" },
        query: {},
        params: { orderId: 1 },
        session: { user_id: 1 },
        dbConnection: {},
      };

      const captureResult = { success: true };

      orderService.capturePaypalPayment.mockResolvedValue(captureResult);

      await orderController.capturePaypalPayment(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_CAPTURE_PAYMENT", long_description: "You must be logged in to perform this action" }
      );
      expect(orderService.capturePaypalPayment).toHaveBeenCalledWith({
        body: req.body,
        query: req.query,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.redirect).toHaveBeenCalledWith(`/order-complete?orderId=${req.params.orderId}`);
    });
  });

  describe("cancelPaypalPayment", () => {
    it("should call orderService.cancelPaypalPayment and redirect to order-complete", async () => {
      const req = {
        body: { paymentId: "PAY-123" },
        query: {},
        params: { orderId: 1 },
        session: { user_id: 1 },
        dbConnection: {},
      };

      const cancelResult = { success: true };

      orderService.cancelPaypalPayment.mockResolvedValue(cancelResult);

      await orderController.cancelPaypalPayment(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_CANCEL_PAYMENT", long_description: "You must be logged in to perform this action" }
      );
      expect(orderService.cancelPaypalPayment).toHaveBeenCalledWith({
        body: req.body,
        query: req.query,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.redirect).toHaveBeenCalledWith(`/order-complete?orderId=${req.params.orderId}`);
    });
  });

  describe("deleteOrder", () => {
    it("should call orderService.deleteOrder and respond with status 200", async () => {
      const req = {
        params: { orderId: 1 },
        session: { user_id: 1 },
        dbConnection: {},
        logger: { info: jest.fn() },
      };
      const deleteResult = { success: true };

      orderService.deleteOrder.mockResolvedValue(deleteResult);

      await orderController.deleteOrder(req, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(
        req.session.user_id,
        "You must be logged in to perform this action",
        { code: "ORDER_UNAUTHORIZED_DELETE", long_description: "You must be logged in to perform this action" }
      );
      expect(authService.requirePermission).toHaveBeenCalledWith(req, "delete", "orders");
      expect(orderService.deleteOrder).toHaveBeenCalledWith({
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(deleteResult);
      expect(req.logger.info).toHaveBeenCalledWith({
        code: "DELETE_SUCCESS",
        short_description: "Order deleted successfully",
        long_description: `Order for user ${req.session.user_id} deleted successfully`,
      });
    });
  });
});