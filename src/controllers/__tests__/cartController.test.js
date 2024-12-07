const CartController = require("../cartController");

describe('CartController', () => {
  let cartService;
  let cartController;
  let req;
  let res;

  beforeEach(() => {
    cartService = {
      getCart: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
      clearCart: jest.fn(),
    };

    cartController = new CartController(cartService);

    req = {
      session: { user_id: 'user123', id: 'session123' },
      body: { quantity: 2 },
      params: { itemId: 'item123' },
      dbConnection: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('getCart', () => {
    it('should call cartService.getCart and return the result', async () => {
      const mockCartResult = { cart_id: 'cart123', items: [] };
      cartService.getCart.mockResolvedValue(mockCartResult);

      await cartController.getCart(req, res);

      expect(cartService.getCart).toHaveBeenCalledWith({
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCartResult);
    });
  });

  describe('updateItem', () => {
    it('should call cartService.updateItem and return the result', async () => {
      const mockUpdateResult = { product_id: 'product123', quantity: 2 };
      cartService.updateItem.mockResolvedValue(mockUpdateResult);

      await cartController.updateItem(req, res);

      expect(cartService.updateItem).toHaveBeenCalledWith({
        body: req.body,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockUpdateResult);
    });
  });

  describe('deleteItem', () => {
    it('should call cartService.deleteItem and return the result', async () => {
      const mockDeleteResult = { success: true };
      cartService.deleteItem.mockResolvedValue(mockDeleteResult);

      await cartController.deleteItem(req, res);

      expect(cartService.deleteItem).toHaveBeenCalledWith({
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockDeleteResult);
    });
  });

  describe('clearCart', () => {
    it('should call cartService.clearCart and return the result', async () => {
      const mockClearResult = { success: true };
      cartService.clearCart.mockResolvedValue(mockClearResult);

      await cartController.clearCart(req, res);

      expect(cartService.clearCart).toHaveBeenCalledWith({
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockClearResult);
    });
  });
});
