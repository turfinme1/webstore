const { ASSERT_USER } = require("../serverConfigurations/assert");
const STATUS_CODES = require("../serverConfigurations/constants");

class OrderController {
    constructor(orderService, authService) {
      this.orderService = orderService;
      this.authService = authService;
      this.createOrder = this.createOrder.bind(this);
      this.createOrderByStaff = this.createOrderByStaff.bind(this);
      this.updateOrderByStaff = this.updateOrderByStaff.bind(this);
      this.deleteOrder = this.deleteOrder.bind(this);
      this.getOrder = this.getOrder.bind(this);
      this.completeOrder = this.completeOrder.bind(this);
    }
  
    async createOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
      const data = {
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.createOrder(data);
      res.status(201).json(result);
    }

    async createOrderByStaff(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
      this.authService.requirePermission(req, "create", 'orders');
      const data = {
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.createOrderByStaff(data);
      res.status(201).json(result);
    }

    async updateOrderByStaff(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
      this.authService.requirePermission(req, "update", 'orders');
      const data = {
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.updateOrderByStaff(data);
      res.status(201).json(result);
    }
  
    async getOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
      const data = {
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.getOrder(data);
      res.status(200).json(result);
    }
  
    async completeOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
      const data = {
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.completeOrder(data);
      res.status(200).json(result);

      await req.logger.info({ code: STATUS_CODES.ORDER_COMPLETE_SUCCESS, short_description: `Order completed successfully`, long_description: `Order for user ${req.session.user_id} completed successfully` });
    }

    async deleteOrder(req, res) {
      ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
      this.authService.requirePermission(req, "delete", 'orders');
      const data = {
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.deleteOrder(data);
      res.status(200).json(result);

      await req.logger.info({ code: STATUS_CODES.DELETE_SUCCESS, short_description: `Order deleted successfully`, long_description: `Order for user ${req.session.user_id} deleted successfully` });
    }
  }
  
  module.exports = OrderController;
  