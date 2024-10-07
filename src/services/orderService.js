class OrderService {
  constructor() {
    this.createOrder = this.createOrder.bind(this);
    this.getOrder = this.getOrder.bind(this);
    this.updateOrderStatus = this.updateOrderStatus.bind(this);
  }

  async createOrder(data) {
    const client = await data.dbConnection.connect();

    // Fetch cart items and calculate total price in SQL
    const cartResult = await client.query(`
        SELECT ci.product_id, ci.quantity, p.price, p.stock 
        FROM cart_items ci 
        LEFT JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE)`,
        [data.session.user_id]
    );

    if (cartResult.rows.length === 0) {
      throw new Error("Cart is empty");
    }

    const cartItems = cartResult.rows;
    let totalPrice = 0;

    for (const item of cartItems) {
      if (item.quantity > item.stock) {
        throw new Error(`Not enough stock for product ID ${item.product_id}`);
      }
      totalPrice += item.quantity * item.price; // We can still check stock and set totalPrice here
    }

    // Create the order and calculate the total in SQL
    const orderResult = await client.query(
      `
        INSERT INTO orders (user_id, status, total_price, payment_method_id, shipping_address_id) 
        VALUES ($1, 'Pending', 
            (SELECT SUM(ci.quantity * p.price) 
                FROM cart_items ci 
                JOIN products p ON ci.product_id = p.id 
                WHERE ci.cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE)), 
            $2, $3) 
        RETURNING *`,
      [
        data.session.user_id,
        data.body.payment_method_id,
        data.body.shipping_address_id,
      ]
    );

    const order = orderResult.rows[0];

    // Insert order items and update stock
    const orderItemsQueries = cartItems.map(async (item) => {
      await client.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
        VALUES ($1, $2, $3, $4)`,
        [order.id, item.product_id, item.quantity, item.price]
      );

      // Update the product stock
      await client.query(
        `
        UPDATE products 
        SET stock = stock - $1 
        WHERE id = $2`,
        [item.quantity, item.product_id]
      );
    });

    await Promise.all(orderItemsQueries);

    // Clear cart
    await client.query(
      `
        DELETE FROM cart_items WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1 AND is_active = TRUE)`,
      [data.session.user_id]
    );

    await client.query("COMMIT");
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
