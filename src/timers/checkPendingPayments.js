const fs = require("fs");
const paypal = require("../serverConfigurations/paypalClient");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const pool = require("../database/dbConfig");
const { ENV } = require("../serverConfigurations/constants");

(async () => {
    let client;
    let logger;
    try {
        client = await pool.connect();
        logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });
        const paypalClient = new paypal.core.PayPalHttpClient(ENV.PAYPAL_CLIENT_ID, ENV.PAYPAL_CLIENT_SECRET);

        const pendingPayments = await client.query(`
            SELECT 
              payments.id as payment_id, 
              orders.id as order_id, 
              payments.provider_payment_id as provider_payment_id
            FROM payments
            JOIN orders ON payments.order_id = orders.id 
            WHERE payments.status = 'Pending' AND payments.created_at > NOW() - INTERVAL '1 day'`
          );
      
          for (const pendingPayment of pendingPayments.rows) {
            const request = new paypal.orders.OrdersGetRequest(pendingPayment.provider_payment_id);
            const paymentDetails = await paypalClient.execute(request);
            const status = paymentDetails.result.status;
      
            if (status === "COMPLETED") {
              await client.query(
                `UPDATE orders SET status = 'Paid', paid_amount = $1
                WHERE id = $2`,
                [paymentDetails.result.purchase_units[0].amount.value, pendingPayment.order_id]
              );
              await client.query(
                `UPDATE payments SET status = 'Paid', payment_provider = 'PayPal', paid_amount = $1
                WHERE id = $2`,
                [paymentDetails.result.purchase_units[0].amount.value, pendingPayment.payment_id]
              );
      
              await logger.info({
                code: 'TIMERS.CHECK_PENDING_PAYMENTS.00044.CAPTURE_SUCCESS',
                short_description: `Payment captured for Order ID: ${pendingPayment.id}`,
                long_description: `Updated payment status to COMPLETED for Order ID: ${pendingPayment.id}`,
              });
            }
          }
          console.log("Cron job for checking pending payments succeeded");
    } catch (error) {
        console.error(error);
        if(logger){
          await logger.error(error);
        }
    } finally {
        if(client){
            client.release();
        }
    }
    process.exit();
})();
