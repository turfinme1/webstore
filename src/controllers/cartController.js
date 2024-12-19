class CartController {
  constructor(cartService) {
    this.cartService = cartService;
    this.getCart = this.getCart.bind(this);
    this.updateItem = this.updateItem.bind(this);
    this.deleteItem = this.deleteItem.bind(this);
    this.clearCart = this.clearCart.bind(this);
    this.applyVoucher = this.applyVoucher.bind(this);
    this.removeVoucher = this.removeVoucher.bind(this);
  }

  async getCart(req, res) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.getCart(data);
    res.status(200).json(result);
  }

  async updateItem(req, res) {
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.updateItem(data);
    res.status(201).json(result);
  }

  async deleteItem(req, res) {
    const data = {
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.deleteItem(data);
    res.status(200).json(result);
  }
        
  async clearCart(req, res) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.clearCart(data);
    res.status(200).json(result);
  }

  async applyVoucher(req, res) {
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.applyVoucher(data);
    res.status(200).json(result);
  }

  async removeVoucher(req, res) {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.removeVoucher(data);
    res.status(200).json(result);
  }
}

module.exports = CartController;
