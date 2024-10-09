class CartService {
  constructor() {
    this.getOrCreateCart = this.getOrCreateCart.bind(this);
    this.mergeCartsOnLogin = this.mergeCartsOnLogin.bind(this);
    this.getCart = this.getCart.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
  }

  async getOrCreateCart(data) {
    const cartResult = await data.dbConnection.query(`
      SELECT *
      FROM carts
      WHERE (user_id = $1 OR session_id = $2) AND is_active = TRUE
      ORDER BY COALESCE(user_id, session_id) DESC
      LIMIT 1`,
      [data.session.user_id, data.session.id]
    );

    if (cartResult.rows.length > 0) {
      return cartResult.rows[0];
    }

    const createCartResult = await data.dbConnection.query(`
      INSERT INTO carts (${data.session.user_id ? 'user_id' : 'session_id'})
      VALUES ($1)
      RETURNING *`,
      [data.session.user_id || data.session.id]
    );

    return createCartResult.rows[0];
  }

  async mergeCartsOnLogin(sessionCart, userCart, dbConnection) {
    if (!sessionCart || !userCart) return;

    // Merge sessionCart items into userCart
    await dbConnection.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
      SELECT $1, product_id, quantity, unit_price
      FROM cart_items
      WHERE cart_id = $2
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
      [userCart.id, sessionCart.id]
    );

    // Optionally, clear the session cart or mark it inactive
    await dbConnection.query(`UPDATE carts SET is_active = FALSE WHERE id = $1`, [sessionCart.id]);
  }

  async getCart(data) {
    const { user_id } = data.session;

    // Fetch active cart (session-based or user-based)
    const cart = await this.getOrCreateCart(data);

    // If user logs in and there is an anonymous session cart, merge it
    if (user_id && cart.session_id) {
      const userCart = await data.dbConnection.query(`
        SELECT * FROM carts WHERE user_id = $1 AND is_active = TRUE`, [user_id]);

      if (userCart.rows.length > 0) {
        await this.mergeCartsOnLogin(cart, userCart.rows[0], data.dbConnection);
        return this.getCart(data); // Re-fetch the merged cart
      } else {
        // Assign the session cart to the user and remove session_id
        await data.dbConnection.query(`
          UPDATE carts SET user_id = $1, session_id = NULL WHERE id = $2`, [user_id, cart.id]);
      }
    }

    // Fetch cart items
    const cartItemsResult = await data.dbConnection.query(`
      SELECT ci.*, p.name AS product_name, p.code AS product_code, 
        (SELECT url FROM images i WHERE i.product_id = p.id LIMIT 1) AS product_image
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at`,
      [cart.id]
    );

    return { cart, items: cartItemsResult.rows };
  }

  async updateItem(data) {
    const cart = await this.getOrCreateCart(data);

    const result = await data.dbConnection.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) 
      VALUES ($1, $2, $3, (SELECT price FROM products WHERE id = $2))
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = EXCLUDED.quantity
      RETURNING *`,
      [cart.id, data.body.product_id, data.body.quantity]
    );

    return result.rows[0];
  }

  async deleteItem(data) {
    const cart = await this.getOrCreateCart(data);

    const result = await data.dbConnection.query(`
      DELETE FROM cart_items 
      WHERE cart_id = $1 AND id = $2
      RETURNING *`,
      [cart.id, data.params.itemId]
    );

    return result.rows[0];
  }

  async clearCart(data) {
    const cart = await this.getOrCreateCart(data);

    await data.dbConnection.query(`
      DELETE FROM cart_items 
      WHERE cart_id = $1`, [cart.id]
    );

    return { message: "Cart cleared successfully." };
  }
}

module.exports = CartService;
