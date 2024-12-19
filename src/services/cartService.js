const { da } = require("@faker-js/faker");
const { ASSERT, ASSERT_USER } = require("../serverConfigurations/assert");
const { STATUS_CODES } = require("../serverConfigurations/constants");

class CartService {
  constructor() {
    this.getOrCreateCart = this.getOrCreateCart.bind(this);
    this.mergeCartsOnLogin = this.mergeCartsOnLogin.bind(this);
    this.getCart = this.getCart.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
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
    
    const cartTotalPriceResult = await data.dbConnection.query(`
      WITH vat AS (
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
          c.voucher_id,
          COALESCE(c.voucher_discount_amount, 0) AS voucher_discount_amount
        FROM carts c
        WHERE c.id = $1
      )
      SELECT
        SUM(ci.total_price) AS total_price,
        ld.discount_percentage,
        ROUND(SUM(ci.total_price) * ld.discount_percentage / 100, 2) AS discount_amount,
        ROUND(SUM(ci.total_price) * (1 - ld.discount_percentage / 100), 2) AS total_price_after_discount,
        vat.vat_percentage,
        ROUND(SUM(ci.total_price) * (1 - ld.discount_percentage / 100) * vat.vat_percentage / 100, 2) AS vat_amount,
        cd.voucher_discount_amount,
        ROUND(SUM(ci.total_price) * (1 - ld.discount_percentage / 100) * (1 + vat.vat_percentage / 100), 2) AS total_price_with_vat,
        ROUND(SUM(ci.total_price) * (1 - ld.discount_percentage / 100) - cd.voucher_discount_amount, 2) AS total_price_with_voucher
      FROM cart_items ci, vat, largest_discount ld, cart_details cd
      WHERE ci.cart_id = $1
      GROUP BY vat.vat_percentage, ld.discount_percentage, cd.voucher_discount_amount`,
      [cart.id]
    );

    const totalPrice = cartTotalPriceResult.rows[0]?.total_price || 0;
    const discountPercentage = cartTotalPriceResult.rows[0]?.discount_percentage || 0;
    const discountAmount = cartTotalPriceResult.rows[0]?.discount_amount || 0;
    const totalPriceAfterDiscount = cartTotalPriceResult.rows[0]?.total_price_after_discount || 0;
    const vatPercentage = cartTotalPriceResult.rows[0]?.vat_percentage || 0;
    const vatAmount = cartTotalPriceResult.rows[0]?.vat_amount || 0;
    const totalPriceWithVat = cartTotalPriceResult.rows[0]?.total_price_with_vat || 0;
    const voucherAmount = cartTotalPriceResult.rows[0]?.voucher_discount_amount || 0;
    const totalPriceWithVoucher = cartTotalPriceResult.rows[0]?.total_price_with_voucher || 0; 

    return { cart, items: cartItemsResult.rows, totalPrice, discountPercentage, discountAmount, totalPriceAfterDiscount, vatPercentage, vatAmount, totalPriceWithVat, voucherAmount, totalPriceWithVoucher };
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

  async applyVoucher(data) {
    const cart = await this.getOrCreateCart(data);

    const voucherResult = await data.dbConnection.query(`
      SELECT * FROM vouchers WHERE code = $1 AND is_active = TRUE AND NOW() BETWEEN start_date AND end_date`,
      [data.body.code]
    );
    ASSERT_USER(voucherResult.rows.length > 0, "Invalid voucher code", {
      code: STATUS_CODES.SRV_CNF_INVALID_VOUCHER_CODE,
      long_description: `Invalid voucher code ${data.body.code}`,
    });
    const voucher = voucherResult.rows[0];

    const voucherUsage = await data.dbConnection.query(`
      SELECT * FROM voucher_usages WHERE user_id = $1 AND voucher_id = $2`,
      [data.session.user_id, voucher.id]
    );
    ASSERT_USER(voucherUsage.rows.length === 0, "Voucher already used", {
      code: STATUS_CODES.SRV_CNF_VOUCHER_ALREADY_USED,
      long_description: `Voucher already used by user ${data.session.user_id}`,
    });

    // await data.dbConnection.query(`
    //   INSERT INTO voucher_usages (user_id, voucher_id)
    //   VALUES ($1, $2)
    //   RETURNING *`,
    //   [data.session.user_id, voucher.id]
    // );

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

    await data.dbConnection.query(`
      UPDATE carts SET voucher_id = NULL, voucher_discount_amount = 0
      WHERE id = $1`,
      [cart.id]
    );

    return { message: "Voucher removed successfully." };
  }
}

module.exports = CartService;
