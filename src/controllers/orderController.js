const { ASSERT_USER } = require("../serverConfigurations/assert");
const STATUS_CODES = require("../serverConfigurations/constants");

class OrderController {
    constructor(orderService) {
      this.orderService = orderService;
      this.createOrder = this.createOrder.bind(this);
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
  }
  
  module.exports = OrderController;
  