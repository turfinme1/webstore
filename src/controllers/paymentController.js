const { validateBody } = require("../serverConfigurations/validation");

class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  createPayment = async (req, res, next) => {
    validateBody(req, req.entitySchemaCollection.paymentSchema);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };
    const result = await this.paymentService.createPayment(data);
    res.status(200).json(result);
  }
}

module.exports = PaymentController;