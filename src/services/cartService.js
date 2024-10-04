class CartService {
  constructor() {
    this.getCart = this.getCart.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
  }

  async getCart(data) {
    let cart;
    const cartResult = await data.dbConnection.query(`
      SELECT * 
      FROM carts 
      WHERE (user_id = $1 OR session_id = $2) AND is_active = TRUE`,
      [data.session.user_id, data.session.id]
    );
  
    if (cartResult.rows.length > 0) {
      cart = cartResult.rows[0];
    } else {
      const createCartResult = await data.dbConnection.query(`
        INSERT INTO carts (user_id, session_id) 
        VALUES ($1, $2) RETURNING *`,
        [data.session.user_id, data.session.id]
      );

      cart = createCartResult.rows[0]; 
    }

    const cartItemsResult = await data.dbConnection.query(`
      SELECT ci.*, p.name AS product_name, 
        (SELECT url FROM images i WHERE i.product_id = p.id LIMIT 1) AS product_image
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at`,
      [cart.id]
    );

    return { cart: cart, items: cartItemsResult.rows };
  }

  async updateItem(data) {
    let cart = await data.dbConnection.query(`
      SELECT id FROM carts WHERE (user_id = $1 OR session_id = $2) AND is_active = TRUE`,
      [data.session.user_id, data.session.id]
    );

    if (cart.rows.length === 0) {
      const cartResult = await data.dbConnection.query(`
        INSERT INTO carts (user_id, session_id) VALUES ($1, $2) RETURNING id`,
        [data.session.user_id, data.session.id]
      );
      cart = cartResult.rows[0];
    } else {
      cart = cart.rows[0];
    }

    const result = await data.dbConnection.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) 
      VALUES ($1, $2, $3, (SELECT price FROM products WHERE id = $2))
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = $3
      RETURNING *`,
      [cart.id, data.body.product_id, data.body.quantity]
    );

    return result.rows[0];
  }

  async deleteItem(data) {
    const result = await data.dbConnection.query(`
      DELETE FROM cart_items 
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1 OR session_id = $2 AND is_active = TRUE) 
      AND id = $3
      RETURNING *`,
      [data.session.user_id, data.session.id, data.params.itemId]
    );

    return result.rows[0];
  }

  async clearCart(data) {
    await data.dbConnection.query(`
      DELETE FROM cart_items 
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1 OR session_id = $2)`,
      [data.session.user_id, data.session.id]
    );

    return { message: "Cart cleared successfully." };
  }
}

module.exports = CartService;
