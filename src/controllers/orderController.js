const { ASSERT_USER } = require("../serverConfigurations/assert");

class OrderController {
    constructor(orderService, authService) {
      this.orderService = orderService;
      this.authService = authService;
      this.createOrder = this.createOrder.bind(this);
      this.createOrderByStaff = this.createOrderByStaff.bind(this);
      this.updateOrderByStaff = this.updateOrderByStaff.bind(this);
      this.deleteOrder = this.deleteOrder.bind(this);
      this.getOrder = this.getOrder.bind(this);
      this.capturePaypalPayment = this.capturePaypalPayment.bind(this);
      this.cancelPaypalPayment = this.cancelPaypalPayment.bind(this);
    }
  
    async createOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00017.UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" });
      const data = {
        body: req.body,
        session: req.session,
        context: req.context,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.createOrder(data);
      res.status(201).json(result);
    }

    async createOrderByStaff(req, res) {
      ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00029.UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" });
      this.authService.requirePermission(req, "create", 'orders');
      const data = {
        body: req.body,
        session: req.session,
        context: req.context,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.createOrderByStaff(data);
      res.status(201).json(result);
    }

    async updateOrderByStaff(req, res) {
      ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00042.UNAUTHORIZED_UPDATE", long_description: "You must be logged in to perform this action" });
      this.authService.requirePermission(req, "update", 'orders');
      const data = {
        body: req.body,
        params: req.params,
        session: req.session,
        context: req.context,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.updateOrderByStaff(data);
      res.status(201).json(result);
    }
  
    async getOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00056.UNAUTHORIZED_READ", long_description: "You must be logged in to perform this action" });
      const data = {
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.getOrder(data);
      res.status(200).json(result);
    }

    async capturePaypalPayment(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00067.UNAUTHORIZED_CAPTURE_PAYMENT", long_description: "You must be logged in to perform this action" });
      const data = {
        body: req.body,
        query: req.query,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.capturePaypalPayment(data);
      res.redirect(`/order-complete?orderId=${req.params.orderId}`);
    }

    async cancelPaypalPayment(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00080.UNAUTHORIZED_CANCEL_PAYMENT", long_description: "You must be logged in to perform this action" });
      const data = {
        body: req.body,
        query: req.query,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.cancelPaypalPayment(data);
      res.redirect(`/order-complete?orderId=${req.params.orderId}`);
    }

    async deleteOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.ORDER.00093.UNAUTHORIZED_DELETE", long_description: "You must be logged in to perform this action" });
      this.authService.requirePermission(req, "delete", 'orders');
      const data = {
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.deleteOrder(data);
      res.status(200).json(result);

      await req.logger.info({ code: "CONTROLLER.ORDER.00103.DELETE_SUCCESS", short_description: `Order deleted successfully`, long_description: `Order for user ${req.session.user_id} deleted successfully` });
    }
  }
  
  module.exports = OrderController;
  