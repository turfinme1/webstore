const { ASSERT_USER } = require("../serverConfigurations/assert");
const STATUS_CODES = require("../serverConfigurations/constants");

class OrderService {
  constructor() {
    this.createOrder = this.createOrder.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.completeOrder = this.completeOrder.bind(this);
  }
  
  async createOrder(data) {
    await this.verifyCartPricesAreUpToDate(data);
    const orderResult = await data.dbConnection.query(
      `
      INSERT INTO orders (user_id, status, total_price) 
      VALUES ($1, 'Pending', 
          (SELECT SUM(ci.quantity * p.price) 
              FROM cart_items ci 
              JOIN products p ON ci.product_id = p.id 
              WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE))) 
      RETURNING *`,
      [data.session.user_id]
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

    ASSERT_USER(cartResult.rows.length > 0, "Cart is empty", STATUS_CODES.INVALID_INPUT);

    for (const item of cartItems) {
      const inventoryResult = await data.dbConnection.query(
        `
      SELECT quantity 
      FROM inventories 
      WHERE product_id = $1`,
        [item.product_id]
      );
      ASSERT_USER(inventoryResult.rows.length > 0, `Not enough stock for product ${item.name}`, STATUS_CODES.INVALID_INPUT);
      ASSERT_USER(parseInt(item.quantity) <= parseInt(inventoryResult.rows[0].quantity), `Not enough stock for product ${item.name}`, STATUS_CODES.INVALID_INPUT);

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

    return { order, message: "Order placed successfully" };
  }

  async getOrder(data) {
    const orderResult = await data.dbConnection.query(
      `
      SELECT o.*, 
        a.street AS shipping_address, a.city AS shipping_city, c.name AS country_name,
        pm.method AS payment_method
      FROM orders o
      LEFT JOIN addresses a ON o.shipping_address_id = a.id
      LEFT JOIN iso_country_codes c ON a.country_id = c.id
      LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
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

  async completeOrder(data) {
    // Create or insert address for the order
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

    // Update the order with the shipping address
    await data.dbConnection.query(
      `
    UPDATE orders 
    SET shipping_address_id = $1 
    WHERE user_id = $2 AND status = 'Pending'`,
      [shippingAddressId, data.session.user_id]
    );

    // Check if order exists
    const orderResult = await data.dbConnection.query(
      `
    SELECT * 
    FROM orders 
    WHERE user_id = $1 AND status = 'Pending'`,
      [data.session.user_id]
    );
    ASSERT_USER(orderResult.rows.length > 0, "Order not found", STATUS_CODES.NOT_FOUND);

    // Update the order status to 'Complete'
    await data.dbConnection.query(
      `
    UPDATE orders 
    SET status = 'Processing' 
    WHERE user_id = $1 AND status = 'Pending'`,
      [data.session.user_id]
    );

    // Commit transaction
    await data.dbConnection.query("COMMIT");

    return { message: "Order completed successfully" };
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
      ASSERT_USER(false, "Prices in your cart have changed. Please review your cart.", STATUS_CODES.CART_PRICES_CHANGED);
    }
  }
}

module.exports = OrderService;
