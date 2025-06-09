class CartController {
  constructor(cartService) {
    this.cartService = cartService;
  }

  getCart = async (req, res) => {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.getCart(data);
    res.status(200).json(result);
  }

  updateItem = async (req, res) => {
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.updateItem(data);
    res.status(201).json(result);
  }

  deleteItem = async (req, res) => {
    const data = {
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.deleteItem(data);
    res.status(200).json(result);
  }
        
  clearCart = async (req, res) => {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.clearCart(data);
    res.status(200).json(result);
  }

  getActiveVouchers = async (req, res) => {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.getActiveVouchers(data);
    res.status(200).json(result);
  }

  applyVoucher = async (req, res) => {
    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.applyVoucher(data);
    res.status(200).json(result);
  }

  removeVoucher = async (req, res) => {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.removeVoucher(data);
    res.status(200).json(result);
  }

  validateStockForItems = async (req, res) => {
    const data = {
      session: req.session,
      dbConnection: req.dbConnection,
    };
    const result = await this.cartService.validateStockForItems(data);
    res.status(200).json(result);
  }
}

module.exports = CartController;
