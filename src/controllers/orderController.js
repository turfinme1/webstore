class OrderController {
    constructor(orderService) {
      this.orderService = orderService;
      this.createOrder = this.createOrder.bind(this);
      this.getOrder = this.getOrder.bind(this);
      this.updateOrderStatus = this.updateOrderStatus.bind(this);
    }
  
    async createOrder(req, res) {
      const data = {
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.createOrder(data);
      res.status(201).json(result);
    }
  
    async getOrder(req, res) {
      const data = {
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.getOrder(data);
      res.status(200).json(result);
    }
  
    async updateOrderStatus(req, res) {
      const data = {
        body: req.body,
        params: req.params,
        dbConnection: req.dbConnection,
      };
      const result = await this.orderService.updateOrderStatus(data);
      res.status(200).json(result);
    }
  }
  
  module.exports = OrderController;
  