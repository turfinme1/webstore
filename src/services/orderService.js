const { ASSERT_USER } = require("../serverConfigurations/assert");
const STATUS_CODES = require("../serverConfigurations/constants");

class OrderService {
  constructor() {
    this.createOrder = this.createOrder.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
  }

  async createOrder(data) {
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

    await data.dbConnection.query("COMMIT");
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

  async updateOrderStatus(data) {
    const result = await data.dbConnection.query(
      `
      UPDATE orders 
      SET status = $1 
      WHERE id = $2
      RETURNING *`,
      [data.body.status, data.params.orderId]
    );
    return result.rows[0];
  }
}

module.exports = OrderService;
