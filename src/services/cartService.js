class CartService {
  constructor() {
    this.getCart = this.getCart.bind(this);
    this.addItem = this.addItem.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
  }

  async getCart(data) {
    const { user_id } = data.session;
    const session_id = data.session.id;

    const cartItemsResult = await data.dbConnection.query(`
      SELECT ci.*, p.name AS product_name, c.id AS cart_id
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE c.user_id = $1 OR c.session_id = $2`,
      [user_id, session_id]
    );
    
    if (cartItemsResult.rows.length > 0) {
      return {
        cart_id: cartItemsResult.rows[0].cart_id,
        items: cartItemsResult.rows,
      };
    }

    const createCartResult = await data.dbConnection.query(`
      INSERT INTO carts (user_id, session_id) 
      VALUES ($1, $2) 
      RETURNING *`,
      [user_id, session_id]
    );
    const newCartId = createCartResult.rows[0].id;

    return {
        cart_id: newCartId,
        items: [],
    };
  }

  async addItem(data) {
    const { user_id } = data.session;
    const session_id = data.session.id;
    const { product_id, quantity, unit_price } = data.body;

    // Check if cart exists
    let cart = await data.dbConnection.query(`
      SELECT id FROM carts WHERE user_id = $1 OR session_id = $2`,
      [user_id, session_id]
    );

    if (cart.rows.length === 0) {
      // Create a new cart
      cart = await data.dbConnection.query(`
        INSERT INTO carts (user_id, session_id) VALUES ($1, $2) RETURNING id`,
        [user_id, session_id]
      );
    } else {
      cart = cart.rows[0];
    }

    // Insert or update cart item
    const result = await data.dbConnection.query(`
      INSERT INTO cart_items (cart_id, product_id, quantity, unit_price) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cart_id, product_id) 
      DO UPDATE SET quantity = cart_items.quantity + $3
      RETURNING *`,
      [cart.id, product_id, quantity, unit_price]
    );

    return result.rows[0];
  }

  async updateItem(data) {
    const { user_id } = data.session;
    const session_id = data.session.id;
    const { product_id } = data.params;
    const { quantity, unit_price } = data.body;

    const result = await data.dbConnection.query(`
      UPDATE cart_items 
      SET quantity = $1, unit_price = $2 
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $3 OR session_id = $4) 
      AND product_id = $5
      RETURNING *`,
      [quantity, unit_price, user_id, session_id, product_id]
    );

    return result.rows[0];
  }
    
  async deleteItem(data) {
    const { user_id } = data.session;
    const session_id = data.session.id;
    const { product_id } = data.params;

    const result = await data.dbConnection.query(`
      DELETE FROM cart_items 
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1 OR session_id = $2) 
      AND product_id = $3
      RETURNING *`,
      [user_id, session_id, product_id]
    );

    return result.rows[0];
  }

  async clearCart(data) {
    const { user_id } = data.session;
    const session_id = data.session.id;

    await data.dbConnection.query(`
      DELETE FROM cart_items 
      WHERE cart_id = (SELECT id FROM carts WHERE user_id = $1 OR session_id = $2)`,
      [user_id, session_id]
    );

    return { message: "Cart cleared successfully." };
  }
}

module.exports = CartService;
