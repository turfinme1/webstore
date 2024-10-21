const { ASSERT_USER } = require("../serverConfigurations/assert");

class PaymentService {
  constructor() {
    this.createPayment = this.createPayment.bind(this);
  }

  async createPayment(data) {
    const failChance = Math.random() <= 0.7;
    const paymentStatus = failChance ? "FAILED" : "SUCCESS";
    ASSERT_USER(paymentStatus === "SUCCESS", "Payment failed");
    console.log(data.body.client_id, data.body.amount);

    return {
      status: "SUCCESS",
      message: "Payment successful",
    };
  }
}

module.exports = PaymentService;
