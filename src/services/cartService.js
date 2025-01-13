const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");

class CartService {
  constructor() {
    this.getOrCreateCart = this.getOrCreateCart.bind(this);
    this.mergeCartsOnLogin = this.mergeCartsOnLogin.bind(this);
    this.getCart = this.getCart.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
    this.getActiveVouchers = this.getActiveVouchers.bind(this);
    this.applyVoucher = this.applyVoucher.bind(this);
    this.removeVoucher = this.removeVoucher.bind(this);
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

    /// check if voucher from cart has changed and update the cart
    const voucherResult = await data.dbConnection.query(`
      SELECT * FROM vouchers WHERE id = $1`, [cart.voucher_id]
    );
    if (voucherResult.rows.length === 1) {
      const voucher = voucherResult.rows[0];
      if (voucher.is_active === false || new Date() < voucher.start_date || new Date() > voucher.end_date) {
        await data.dbConnection.query(`
          UPDATE carts SET voucher_id = NULL, voucher_discount_amount = 0 WHERE id = $1`, [cart.id]
        );
      } else {
        await data.dbConnection.query(`
          UPDATE carts SET voucher_discount_amount = $1 WHERE id = $2`, [voucher.discount_amount, cart.id]
        );
      }
    }
    
    const cartItemsAndCalculationsResult = await data.dbConnection.query(`
      WITH cart_items_cte AS (
        SELECT 
          cart_items.*,
          products.name AS product_name,
          products.code AS product_code,
          (SELECT url FROM images WHERE images.product_id = products.id LIMIT 1) AS product_image
        FROM cart_items
        LEFT JOIN products ON cart_items.product_id = products.id
        WHERE cart_items.cart_id = $1
      ),
      vat AS (
        SELECT vat_percentage FROM app_settings LIMIT 1
      ),
      largest_discount AS (
        SELECT COALESCE(MAX(discount_percentage), 0) AS discount_percentage
        FROM promotions
        WHERE is_active = TRUE
          AND NOW() BETWEEN start_date AND end_date
      ),
      cart_details AS (
        SELECT 
          carts.voucher_id,
          vouchers.code AS voucher_code,
          COALESCE(carts.voucher_discount_amount, 0) AS voucher_amount
        FROM carts
        LEFT JOIN vouchers ON carts.voucher_id = vouchers.id
        WHERE carts.id = $1
      ),
      price_calcs AS (
        SELECT
          SUM(cart_items_cte.total_price) AS total_price,
          largest_discount.discount_percentage,
          ROUND(SUM(cart_items_cte.total_price) * largest_discount.discount_percentage / 100, 2) AS discount_amount,
          ROUND(SUM(cart_items_cte.total_price) * (1 - largest_discount.discount_percentage / 100), 2) AS total_price_after_discount,
          vat.vat_percentage,
          ROUND(SUM(cart_items_cte.total_price) * (1 - largest_discount.discount_percentage / 100) * vat.vat_percentage / 100, 2) AS vat_amount,
          cart_details.voucher_amount,
          cart_details.voucher_code,
          ROUND(SUM(cart_items_cte.total_price) * (1 - largest_discount.discount_percentage / 100) * (1 + vat.vat_percentage / 100), 2) AS total_price_with_vat,
          ROUND(GREATEST(SUM(cart_items_cte.total_price) * (1 - largest_discount.discount_percentage / 100) * (1 + vat.vat_percentage / 100) - cart_details.voucher_amount, 0), 2) AS total_price_with_voucher
        FROM cart_items_cte, vat, largest_discount, cart_details
        GROUP BY vat.vat_percentage, largest_discount.discount_percentage, cart_details.voucher_amount, cart_details.voucher_code
      )
      SELECT 
        jsonb_agg(to_jsonb(cart_items_cte.*)) AS items,
        to_jsonb(price_calcs.*) AS price_calculations
      FROM cart_items_cte
      CROSS JOIN price_calcs
      GROUP BY price_calcs.*`,
      [cart.id]
    );
    const cartItemsAndCalculations = cartItemsAndCalculationsResult.rows[0];

    return { 
      cart,
      items: cartItemsAndCalculations?.items || [],
      ...cartItemsAndCalculations?.price_calculations,
    }
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

  async getActiveVouchers(data) {
    const result = await data.dbConnection.query(`
      SELECT vouchers.* FROM vouchers 
      JOIN campaigns ON campaigns.voucher_id = vouchers.id
      JOIN target_groups ON campaigns.target_group_id = target_groups.id
      JOIN user_target_groups ON user_target_groups.target_group_id = target_groups.id
      LEFT JOIN voucher_usages ON voucher_usages.voucher_id = vouchers.id
      WHERE user_target_groups.user_id = $1
        AND voucher_usages.user_id IS NULL
        AND campaigns.is_active = TRUE
        AND campaigns.status = 'Active'
        AND vouchers.is_active = TRUE`,
      [data.session.user_id]
    );

    return result.rows;
  }

  async applyVoucher(data) {
    const cart = await this.getOrCreateCart(data);

    const voucherResult = await data.dbConnection.query(`
      SELECT vouchers.* FROM vouchers 
      JOIN campaigns ON campaigns.voucher_id = vouchers.id
      JOIN target_groups ON campaigns.target_group_id = target_groups.id
      JOIN user_target_groups ON user_target_groups.target_group_id = target_groups.id
      WHERE user_target_groups.user_id = $1
	  	  AND vouchers.code = $2
        AND campaigns.is_active = TRUE
        AND campaigns.status = 'Active'
        AND vouchers.is_active = TRUE`,
      [data.session.user_id, data.body.code]
    );
    ASSERT_USER(voucherResult.rows.length > 0, "Invalid voucher code", {
      code: "SRV_CNF_INVALID_VOUCHER_CODE",
      long_description: `Invalid voucher code ${data.body.code}`,
    });
    const voucher = voucherResult.rows[0];

    const voucherUsage = await data.dbConnection.query(`
      SELECT * FROM voucher_usages WHERE user_id = $1 AND voucher_id = $2`,
      [data.session.user_id, voucher.id]
    );
    ASSERT_USER(voucherUsage.rows.length === 0, "Voucher already used", {
      code: "SRV_CNF_VOUCHER_ALREADY_USED",
      long_description: `Voucher already used by user ${data.session.user_id}`,
    });

    await data.dbConnection.query(`
      UPDATE carts SET voucher_id = $1, voucher_discount_amount = $2
      WHERE id = $3
      RETURNING *`,
      [voucher.id, voucher.discount_amount, cart.id]
    );

    return { message: "Voucher applied successfully." };
  }

  async removeVoucher(data) {
    const cart = await this.getOrCreateCart(data);
    ASSERT_USER(cart.voucher_id, "No voucher applied", {
      code: "SRV_CNF_NO_VOUCHER_APPLIED",
      long_description: "No voucher applied to the cart",
    });

    await data.dbConnection.query(`
      UPDATE carts SET voucher_id = NULL, voucher_discount_amount = 0
      WHERE id = $1`,
      [cart.id]
    );

    return { message: "Voucher removed successfully." };
  }
}

module.exports = CartService;
