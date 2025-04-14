const { faker } = require("@faker-js/faker");
const pool = require("../database/dbConfig");
const Logger = require("../serverConfigurations/logger");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");

const TOTAL_ORDERS_PER_DAY = 1000;
const BATCH_SIZE = 100;
const BATCHES_PER_DAY = Math.ceil(TOTAL_ORDERS_PER_DAY / BATCH_SIZE);
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_BATCH = Math.floor(MS_PER_DAY / BATCHES_PER_DAY);

async function getRandomProducts(client, count) {
  const result = await client.query(`
    SELECT id, price, stock_price 
    FROM products 
    ORDER BY RANDOM() 
    LIMIT $1`, 
    [count]
  );
  return result.rows;
}

async function getRandomUsers(client, count) {
  const result = await client.query(`
    SELECT id 
    FROM users 
    WHERE is_active = TRUE 
    ORDER BY RANDOM() 
    LIMIT $1`,
    [count]
  );
  return result.rows;
}

async function getUsersWithUnusedVouchers(client, count) {
  const result = await client.query(`
    SELECT 
      u.id AS user_id,
      v.id AS voucher_id,
      v.code AS voucher_code,
      v.discount_amount
    FROM users u
    JOIN user_target_groups utg ON u.id = utg.user_id
    JOIN target_groups tg ON utg.target_group_id = tg.id
    JOIN campaigns c ON tg.id = c.target_group_id
    JOIN vouchers v ON c.voucher_id = v.id
    WHERE 
      u.is_active = TRUE
      AND c.status = 'Active'
      AND v.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM voucher_usages vu 
        WHERE vu.user_id = u.id AND vu.voucher_id = v.id
      )
    ORDER BY RANDOM()
    LIMIT $1`,
    [count]
  );
  return result.rows;
}

async function generateOrders(client, count) {
    const orders = [];

    const usersWithVouchers = await getUsersWithUnusedVouchers(client, count);
    const products = await getRandomProducts(client, 500);

    for (const user of usersWithVouchers) {
        const productCount = faker.number.int({ min: 1, max: 5 });
        const orderProducts = faker.helpers.shuffle(products).slice(0, productCount);
        
        const orderItems = orderProducts.map(product => ({
        product_id: product.id,
        quantity: faker.number.int({ min: 1, max: 10 }),
        unit_price: product.price,
        stock_price: product.stock_price
        }));
        
        const totalPrice = orderItems.reduce((sum, item) => sum + item.quantity * parseFloat(item.unit_price), 0);
        const totalStockPrice = orderItems.reduce((sum, item) => sum + item.quantity * parseFloat(item.stock_price), 0);

        orders.push({
        user_id: user.user_id,
        items: orderItems,
        status: 'Paid',
        total_price: totalPrice,
        total_stock_price: totalStockPrice,
        voucher_code: user.voucher_code,
        voucher_discount_amount: user.discount_amount,
        voucher_id: user.voucher_id,
        });
    }

    return orders;
}

async function insertOrderBatch(orders, client, logger) {
  for (const order of orders) {
    const orderResult = await client.query(`
      WITH settings AS (
        SELECT vat_percentage FROM app_settings LIMIT 1
      ),
      total_calc AS (
        SELECT 
          $1::decimal as base_total,
          settings.vat_percentage,
          $2 as status,
          ROUND(
            $1::decimal * (1 + settings.vat_percentage / 100),
            2
          ) as total_with_vat,
          $4::decimal as total_stock_price,
          $5 as voucher_code,
          $6::decimal as voucher_discount_amount
        FROM settings
      )
      INSERT INTO orders (
        user_id, 
        status, 
        total_price,
        total_stock_price,
        vat_percentage,
        discount_percentage,
        voucher_code,
        voucher_discount_amount,
        paid_amount
      ) 
      SELECT 
        $3,
        status,
        base_total,
        total_stock_price,
        vat_percentage,
        0,
        voucher_code,
        voucher_discount_amount,
        CASE 
          WHEN status = 'Paid' THEN 
            ROUND(GREATEST(total_with_vat - voucher_discount_amount, 0), 2)
          ELSE 0
        END
      FROM total_calc
      RETURNING *`,
      [
        order.total_price, 
        order.status, 
        order.user_id, 
        order.total_stock_price,
        order.voucher_code,
        order.voucher_discount_amount
      ]
    );

    const orderId = orderResult.rows[0].id;

    const values = [];
    const params = [];
    let paramIndex = 1;

    order.items.forEach(item => {
      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(
        orderId,
        item.product_id,
        item.quantity,
        item.unit_price
      );
    });

    await client.query(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price)
      VALUES ${values.join(', ')}`,
      params
    );
    
    if (order.voucher_id) {
      await client.query(`
        INSERT INTO voucher_usages (user_id, voucher_id)
        VALUES ($1, $2)`,
        [order.user_id, order.voucher_id]
      );
    }
  }
}

(async () => {
  while (true) {
    let client;
    let logger;

    try {
      const now = new Date();
      const startOfDay = new Date((new Date()).setHours(0,0,0,0));
      const batchesRemaining = BATCHES_PER_DAY - Math.floor((now - startOfDay) / MS_PER_BATCH);

      if (batchesRemaining <= 0) {
        const tomorrow = new Date(startOfDay);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const msUntilTomorrow = tomorrow - now;
        await new Promise(resolve => setTimeout(resolve, msUntilTomorrow));
        continue;
      }
      
      for (let i = 0; i < batchesRemaining; i++) {
        const batchStart = Date.now();
          
        try {
          client = await pool.connect();
          logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });

          await client.query('BEGIN');
          const orders = await generateOrders(client, BATCH_SIZE);
          await insertOrderBatch(orders, client, logger);
          await client.query('COMMIT');
          
          console.log(`Completed order batch ${BATCHES_PER_DAY - batchesRemaining + i + 1}/${BATCHES_PER_DAY}`);
        } catch (error) {
          await client.query('ROLLBACK');
          await logger.error({
            code: 'CRON_ORDER_GENERATION_BATCH_ERROR',
            short_description: `Failed to generate orders batch`,
            long_description: error.message,
            debug_info: error.stack
          });
        } finally {
          if (client) client.release();
        }

        const processingTime = Date.now() - batchStart;
        const waitTime = Math.max(0, MS_PER_BATCH - processingTime);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      await logger.info({
        code: 'TIMERS.DAILY_ORDER_IMPORT.00181.ORDER_IMPORT_SUCCESS',
        short_description: `Generated ${TOTAL_ORDERS_PER_DAY} orders`,
        long_description: `Successfully inserted ${TOTAL_ORDERS_PER_DAY} orders`
      });
    } catch (error) {
      console.error("Error in order generation process:", error);
      if (logger) await logger.error(error);
      await new Promise(resolve => setTimeout(resolve, 60000));
    } finally {
      if (client) client.release();
    }
  }
})();