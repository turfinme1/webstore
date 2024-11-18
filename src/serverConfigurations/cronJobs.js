const fs = require("fs");
const paypal = require("@paypal/checkout-server-sdk");
const Logger = require("./logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const STATUS_CODES = require("./constants");

async function clearOldFileUploads(pool) {
  let logger;
  try {
    const logger = new Logger({ dbConnection: new DbConnectionWrapper(await pool.connect()) });
    const client = await pool.connect();
    const oldFileResult = await client.query(
      `SELECT * FROM file_uploads WHERE created_at < NOW() - INTERVAL '1 day'`
    );
    for (const file of oldFileResult.rows) {
      await fs.promises.unlink(file.file_path);
      await client.query(`DELETE FROM file_uploads WHERE id = $1`, [file.id]);
    }
    
    await logger.info({ 
      code: STATUS_CODES.CRON_SUCCESS, 
      short_description: "Cron job for clearing files succeeded", 
      long_description: "Cleared stale file uploads older than 1 day" 
    });
  } catch (error) {
    if(logger){
      await logger.error(error);
    }
  }
}

async function checkPendingPayments(pool, paypalClient, orderService) {
  let logger;
  try {
    logger = new Logger({ dbConnection: new DbConnectionWrapper(await pool.connect()) });
    const client = await pool.connect();
    
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
          code: STATUS_CODES.CRON_SUCCESS,
          short_description: `Payment captured for Order ID: ${pendingPayment.id}`,
          long_description: `Updated payment status to COMPLETED for Order ID: ${pendingPayment.id}`,
        });
      }
    }
  } catch (error) {
    if (logger) {
      await logger.error(error);
    }
  }
}

module.exports = { clearOldFileUploads, checkPendingPayments };
