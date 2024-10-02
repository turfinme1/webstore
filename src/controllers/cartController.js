const ERROR_CODES = require("../serverConfigurations/constants");
const { ASSERT_USER } = require("../serverConfigurations/assert");

class CartController {
  constructor(cartService) {
    this.cartService = cartService;
    this.getCart = this.getCart.bind(this);
    this.addItem = this.addItem.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
  }

  async getCart(req, res) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.getCart(data);
    res.status(200).json(result);
  }

  async addItem(req, res) {
    ASSERT_USER(req.session.user_id || req.session.id, "You must have a session to add items", ERROR_CODES.UNAUTHORIZED);
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.addItem(data);
    res.status(201).json(result);
  }

  async updateItem(req, res) {
    ASSERT_USER(req.session.user_id || req.session.id, "You must have a session to update items", ERROR_CODES.UNAUTHORIZED);
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.updateItem(data);
    res.status(200).json(result);
  }

  async deleteItem(req, res) {
    ASSERT_USER(req.session.user_id || req.session.id, "You must have a session to delete items", ERROR_CODES.UNAUTHORIZED);
    const data = {
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.deleteItem(data);
    res.status(200).json(result);
  }
        
  async clearCart(req, res) {
    ASSERT_USER(req.session.user_id || req.session.id, "You must have a session to clear the cart", ERROR_CODES.UNAUTHORIZED);
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.clearCart(data);
    res.status(200).json(result);
  }
}

module.exports = CartController;
