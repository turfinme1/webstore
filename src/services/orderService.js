const { ASSERT_USER, ASSERT } = require("../serverConfigurations/assert");
const { STATUS_CODES, ENV} = require("../serverConfigurations/constants");
const paypal = require("../serverConfigurations/paypalClient");

class OrderService {
  constructor(emailService, paypalClient) { 
    this.emailService = emailService;
    this.paypalClient = paypalClient;
    this.createOrder = this.createOrder.bind(this);
    this.createOrderByStaff = this.createOrderByStaff.bind(this);
    this.updateOrderByStaff = this.updateOrderByStaff.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.capturePaypalPayment = this.capturePaypalPayment.bind(this);
    this.cancelPaypalPayment = this.cancelPaypalPayment.bind(this);
    this.verifyCartPricesAreUpToDate = this.verifyCartPricesAreUpToDate.bind(this);
    this.deleteOrder = this.deleteOrder.bind(this);
  }
  
  async createOrder(data) {
    await this.verifyCartPricesAreUpToDate(data);

    const addressResult = await data.dbConnection.query(
      `
      INSERT INTO addresses (user_id, street, city, country_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id`,
      [
        data.session.user_id,
        data.body.address.street,
        data.body.address.city,
        data.body.address.country_id,
      ]
    );
    const shippingAddressId = addressResult.rows[0].id;

    const orderResult = await data.dbConnection.query(
      `
      INSERT INTO orders (user_id, status, shipping_address_id, vat_percentage, discount_percentage, total_price) 
      VALUES ($1, 'Pending', $2, $3, (SELECT COALESCE(SUM(discount_percentage), 0) FROM promotions WHERE is_active = TRUE AND NOW() BETWEEN start_date AND end_date),
          (SELECT SUM(ci.quantity * p.price) 
              FROM cart_items ci 
              JOIN products p ON ci.product_id = p.id 
              WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE))) 
      RETURNING *`,
      [data.session.user_id, shippingAddressId, data.context.settings.vat_percentage]
    );
    const order = orderResult.rows[0];

    const cartResult = await data.dbConnection.query(
      `
      SELECT ci.*, p.name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id 
      WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE)`,
      [data.session.user_id]
    );
    const cartItems = cartResult.rows;
    ASSERT_USER(cartResult.rows.length > 0, "Cart is empty", { code: STATUS_CODES.INVALID_INPUT, long_description: "Cart is empty" });

    for (const item of cartItems) {
      const inventoryResult = await data.dbConnection.query(
        `
      SELECT quantity 
      FROM inventories 
      WHERE product_id = $1`,
        [item.product_id]
      );
      ASSERT_USER(inventoryResult.rows.length > 0, `Not enough stock for product ${item.name}`, { code: STATUS_CODES.INVALID_INPUT, long_description: `Not enough stock for product ${item.name}` });
      ASSERT_USER(parseInt(item.quantity) <= parseInt(inventoryResult.rows[0].quantity), `Not enough stock for product ${item.name}`, { code: STATUS_CODES.INVALID_INPUT, long_description: `Not enough stock for product ${item.name}` });

      await data.dbConnection.query(
        `
          INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
          VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.unit_price]
      );

      await data.dbConnection.query(
        `
          UPDATE inventories
          SET quantity = quantity - $1
          WHERE product_id = $2`,
        [item.quantity, item.product_id]
      );
    }

    await data.dbConnection.query(
      `
      UPDATE carts SET is_active = FALSE
      WHERE user_id = $1`,
      [data.session.user_id]
    );

    const orderViewResult = await data.dbConnection.query(`
      SELECT * FROM orders_detail_view WHERE id = $1`,
      [order.id]
    );
    const orderView = orderViewResult.rows[0];

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: orderView.total_price_with_vat,
          },
        },
      ],
      application_context: {
        return_url: `${ENV.DEVELOPMENT_URL}/api/paypal/capture/${order.id}`,
        cancel_url: `${ENV.DEVELOPMENT_URL}/api/paypal/cancel/${order.id}`,
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW'
      }
    });
    
    const paypalOrder = await this.paypalClient.execute(request);
    const approvalUrl = paypalOrder.result.links.find(link => link.rel === "approve").href;

    const paymentResult = await data.dbConnection.query(
      `INSERT INTO payments (order_id, payment_provider, provider_payment_id, status)
      VALUES ($1, 'PayPal', $2, 'Pending')
      RETURNING *`,
      [order.id, paypalOrder.result.id]
    );

    const userResult = await data.dbConnection.query(`SELECT * FROM users WHERE id = $1`, [data.session.user_id]);
    const user = userResult.rows[0];
    const emailObject = { 
      dbConnection: data.dbConnection,
      emailData: {
        templateType: "Order created",
        recipient: orderView.email,
        first_name: user.first_name,
        last_name: user.last_name,
        order_table: orderView,
        order_number: orderView.id,
      }
    };
    await this.emailService.queueEmail(emailObject);

    return { approvalUrl, paypalOrder, message: "Order placed successfully" };
  }
  
  async createOrderByStaff(data){
      // Step 1: Insert the order into the orders table
    const orderResult = await data.dbConnection.query(
      `
      INSERT INTO orders (user_id, status, vat_percentage, discount_percentage, total_price) 
      VALUES ($1, $2, $3, (SELECT COALESCE(SUM(discount_percentage), 0) FROM promotions WHERE is_active = TRUE AND NOW() BETWEEN start_date AND end_date),
      (
        SELECT SUM(p.price * (oi->>'quantity')::BIGINT)
        FROM products p
        JOIN jsonb_array_elements($4::jsonb) AS oi ON p.id = (oi->>'id')::BIGINT
      ))
      RETURNING *;
      `,
      [data.body.user_id, data.body.order_status, data.context.settings.vat_percentage, JSON.stringify(data.body.order_items)]
    );
    const order = orderResult.rows[0];

    // Step 2: Insert the order items into the order_items table
    for (const item of data.body.order_items) {
      const productResult = await data.dbConnection.query(
        `SELECT price FROM products WHERE id = $1`,
        [item.id]
      );
      const unitPrice = productResult.rows[0].price;

      await data.dbConnection.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
        VALUES ($1, $2, $3, $4)`,
        [order.id, item.id, item.quantity, unitPrice]
      );

      // Update inventory
      await data.dbConnection.query(
        `
        UPDATE inventories
        SET quantity = quantity - $1
        WHERE product_id = $2`,
        [item.quantity, item.id]
      );
    }

    // Step 3: Insert the address into the addresses table
    const addressResult = await data.dbConnection.query(
      `
      INSERT INTO addresses (user_id, street, city, country_id) 
      VALUES ($1, $2, $3, $4) 
      RETURNING id;
      `,
      [data.body.user_id, data.body.street, data.body.city, data.body.country_id]
    );
    const addressId = addressResult.rows[0].id;

    // Step 4: Update the order with the shipping address
    await data.dbConnection.query(
      `
      UPDATE orders 
      SET shipping_address_id = $1 
      WHERE id = $2`,
      [addressId, order.id]
    );

    return { order, message: "Order created successfully" };
  }

  async updateOrderByStaff(data){
    await data.dbConnection.query(`
      UPDATE orders
      SET status = $1
      WHERE id = $2`,
      [data.body.order_status, data.params.orderId]
    );

    const orderResult = await data.dbConnection.query(
      `
      SELECT * FROM orders_view WHERE id = $1`,
      [data.params.orderId]
    );
    ASSERT_USER(orderResult.rows.length === 1, "Order not found", { code: STATUS_CODES.NOT_FOUND, long_description: "Order not found" });
    const order = orderResult.rows[0];


    if (order.status !== "Pending") {
      ASSERT_USER(order.order_items.length === data.body.order_items.length, "Order items cannot be changed", { code: STATUS_CODES.INVALID_INPUT, long_description: "Order items cannot be changed" });

      for (let i = 0; i < order.order_items.length; i++) {
        ASSERT_USER(order.order_items[i].product_id === data.body.order_items[i].product_id, "Order items cannot be changed", { code: STATUS_CODES.INVALID_INPUT, long_description: "Order items cannot be changed" });
        ASSERT_USER(order.order_items[i].quantity === data.body.order_items[i].quantity, "Order items cannot be changed", { code: STATUS_CODES.INVALID_INPUT, long_description: "Order items cannot be changed" });
      }
    } else {
      const existingItems = order.order_items;
      const updatedItems = data.body.order_items; 

      const removedItems = existingItems.filter(
        existingItem => !updatedItems.some(updatedItem => updatedItem.product_id === existingItem.product_id)
      );

      for (const removedItem of removedItems) {
        await data.dbConnection.query(
          `UPDATE inventories SET quantity = quantity + $1 WHERE product_id = $2`,
          [removedItem.quantity, removedItem.product_id]
        );

        await data.dbConnection.query(
          `DELETE FROM order_items WHERE order_id = $1 AND product_id = $2`,
          [data.params.orderId, removedItem.product_id]
        );
      }

      for (const item of data.body.order_items) {
        const existingItem = existingItems.find(existing => existing.product_id === item.product_id);

        if (existingItem) {
          // Calculate the quantity difference and update the inventory accordingly
          const quantityDifference = item.quantity - existingItem.quantity;
  
          if (quantityDifference !== 0) {
            await data.dbConnection.query(
              `UPDATE inventories SET quantity = quantity - $1 WHERE product_id = $2`,
              [quantityDifference, item.product_id]
            );
  
            // Update order item with new quantity and unit price
            await data.dbConnection.query(
              `UPDATE order_items SET quantity = $1 WHERE order_id = $2 AND product_id = $3`,
              [item.quantity, data.params.orderId, item.product_id]
            );
          }
        } else {
          // New product, insert it into the order and update inventory
          const productResult = await data.dbConnection.query(
            `SELECT * FROM products WHERE id = $1`,
            [item.id]
          );
          const unitPrice = productResult.rows[0].price;
  
          await data.dbConnection.query(
            `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)`,
            [data.params.orderId, item.id, item.quantity, unitPrice]
          );
  
          // Deduct quantity from inventory
          await data.dbConnection.query(
            `UPDATE inventories SET quantity = quantity - $1 WHERE product_id = $2`,
            [item.quantity, item.id]
          );
        }
      }

      // Step 2: Update the total price of the order
      await data.dbConnection.query(
        `
        UPDATE orders
        SET total_price = (
          SELECT SUM(quantity * unit_price)
          FROM order_items
          WHERE order_id = $1
        )
        WHERE id = $1`,
        [data.params.orderId]
      );

      // Step 3: Update the shipping address
      await data.dbConnection.query(`
        UPDATE addresses
        SET street = $1, city = $2, country_id = $3
        WHERE id = (SELECT shipping_address_id FROM orders WHERE id = $4)`,
        [data.body.street, data.body.city, data.body.country_id, data.params.orderId]
      );
    }

    return { message: "Order updated successfully" };
  }

  async getOrder(data) {
    const orderResult = await data.dbConnection.query(
      `
      SELECT o.*
      FROM orders o
      WHERE o.id = $1 AND o.user_id = $2`,
      [data.params.orderId, data.session.user_id]
    );

    const order = orderResult.rows[0];

    if (!order) {
      throw new Error("Order not found");
    }

    const orderItemsResult = await data.dbConnection.query(
      `
      SELECT oi.*, p.name AS product_name 
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1`,
      [data.params.orderId]
    );

    return { order, items: orderItemsResult.rows };
  }

  async capturePaypalPayment(data) {
    const request = new paypal.orders.OrdersCaptureRequest(data.query.token);
    
    const orderViewResult = await data.dbConnection.query(`
      SELECT * FROM orders_detail_view WHERE id = (SELECT order_id FROM payments WHERE provider_payment_id = $1 LIMIT 1)`,
      [data.query.token]
    );
    ASSERT_USER(orderViewResult.rows.length > 0, "Order not found", { code: STATUS_CODES.NOT_FOUND, long_description: "Order not found" });
    const order = orderViewResult.rows[0];
    
    const paymentResult = await data.dbConnection.query(`
      UPDATE payments
      SET status = 'Paid', payment_provider = 'PayPal', paid_amount = $1
      WHERE provider_payment_id = $2
      RETURNING *`,
      [order.total_price_with_vat, data.query.token]
    );
    ASSERT_USER(paymentResult.rows.length > 0, "Payment not found", { code: STATUS_CODES.ORDER_COMPLETE_FAILURE, long_description: "Payment not found" });

    const payment = paymentResult.rows[0];
    
    await data.dbConnection.query(`
      UPDATE orders
      SET status = 'Paid', paid_amount = $1
      WHERE id = $2`,
      [order.total_price_with_vat, order.id]
    );
    
    const capture = await this.paypalClient.execute(request);
    ASSERT(capture.result.status === "COMPLETED", "Payment failed", { code: STATUS_CODES.ORDER_COMPLETE_FAILURE, long_description: "Payment failed" });
    await data.dbConnection.query("COMMIT");
    
    const userResult = await data.dbConnection.query(`SELECT * FROM users WHERE id = $1`, [data.session.user_id]);
    const user = userResult.rows[0];
    const emailObject = {
      dbConnection: data.dbConnection,
      emailData: {
        templateType: "Order paid",
        recipient: order.email,
        first_name: user.first_name,
        last_name: user.last_name,
        order_table: order,
        order_number: order.id,
        payment_number: payment.payment_hash,
      }
    };
    await this.emailService.queueEmail(emailObject);

    return { message: "Payment completed successfully" };
  }

  async cancelPaypalPayment(data) {
    const paymentResult = await data.dbConnection.query(`
      SELECT * FROM payments WHERE provider_payment_id = $1`,
      [data.query.token]
    );
    ASSERT_USER(paymentResult.rows.length === 1, "Payment not found", { code: STATUS_CODES.NOT_FOUND, long_description: "Payment not found" });
    ASSERT_USER(paymentResult.rows[0].status === "Pending", "Payment status cannot be changed", { code: STATUS_CODES.INVALID_INPUT, long_description: "Payment status cannot be changed" });

    const orderViewResult = await data.dbConnection.query(`
      SELECT * FROM orders_view WHERE id = (SELECT order_id FROM payments WHERE provider_payment_id = $1 LIMIT 1)`,
      [data.query.token]
    );
    ASSERT_USER(orderViewResult.rows.length > 0, "Order not found", { code: STATUS_CODES.NOT_FOUND, long_description: "Order not found" });
    const order = orderViewResult.rows[0];

    await data.dbConnection.query(`
      UPDATE orders
      SET status = 'Cancelled'
      WHERE id = $1`,
      [order.id]
    );

    await data.dbConnection.query(`
      UPDATE payments
      SET status = 'Expired'
      WHERE provider_payment_id = $1`,
      [data.query.token]
    );

    return { message: "Payment cancelled successfully" };
  }

  async verifyCartPricesAreUpToDate(data) {
    let arePricesUpToDate = true;

    const cartResult = await data.dbConnection.query(
      `
      SELECT ci.*, p.price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE)`,
      [data.session.user_id]
    );
    const cartItems = cartResult.rows;

    for (const item of cartItems) {
      const productResult = await data.dbConnection.query(
        `
        SELECT price
        FROM products
        WHERE id = $1`,
        [item.product_id]
      );
      const currentPrice = productResult.rows[0].price;

      if (currentPrice !== item.unit_price) {
        arePricesUpToDate = false;
        await data.dbConnection.query(
          `
          UPDATE cart_items
          SET unit_price = $1
          WHERE cart_id = (SELECT id FROM carts WHERE user_id = $2 AND is_active = TRUE) AND product_id = $3`,
          [currentPrice, data.session.user_id, item.product_id]
        );
      }
    }
    
    if(! arePricesUpToDate) {
      await data.dbConnection.query("COMMIT");
      ASSERT_USER(false, "Prices in your cart have changed. Please review your cart.", { code: STATUS_CODES.CART_PRICES_CHANGED, long_description: "Prices in your cart have changed. Please review your cart." });
    }
  }

  async deleteOrder(data) {
    const orderResult = await data.dbConnection.query(
      `
      UPDATE orders
      SET is_active = FALSE
      WHERE id = $1
      RETURNING *`,
      [data.params.orderId]
    );

    ASSERT_USER(orderResult.rows.length > 0, "Order not found", { code: STATUS_CODES.NOT_FOUND, long_description: "Order not found" });

    return { message: "Order deleted successfully" };
  }
}

module.exports = OrderService;
