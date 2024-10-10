const CartService = require("../cartService");

describe('CartService', () => {
  let cartService;
  let dbConnection;

  beforeEach(() => {
    cartService = new CartService();
    dbConnection = {
      query: jest.fn(),
    };
  });

  describe('getCart', () => {
    it('should return an existing cart with items', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };
      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({ rows: [{ id: 'item1', product_name: 'Product 1' }] }); // Cart items

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };

      const result = await cartService.getCart(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(2);
      expect(result.cart).toEqual(mockCart);
      expect(result.items).toEqual([{ id: 'item1', product_name: 'Product 1' }]);
    });

    it('should create a new cart if none exists', async () => {
      const mockNewCart = { id: 'newCart123', user_id: 'user123', session_id: null };
      
      // Mock the getOrCreateCart method
      jest.spyOn(cartService, 'getOrCreateCart').mockResolvedValue(mockNewCart);
    
      dbConnection.query
        .mockResolvedValueOnce({ rows: [] })  // No user cart merging needed
        .mockResolvedValueOnce({ rows: [] });  // No cart items
    
      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };
    
      const result = await cartService.getCart(data);
    
      // Expect that getOrCreateCart was called instead of being tested here
      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(data);
      expect(dbConnection.query).toHaveBeenCalledTimes(1);  // The number of db queries related to the cart items only
      expect(result.cart).toEqual(mockNewCart);
      expect(result.items).toEqual([]);
    });
    
  });

  describe('updateItem', () => {
    it('should add or update an item in the cart', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };
      const mockUpdatedItem = { product_id: 'product123', quantity: 2 };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({ rows: [mockUpdatedItem] });  // Item updated

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        body: { product_id: 'product123', quantity: 2 },
        dbConnection,
      };

      const result = await cartService.updateItem(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockUpdatedItem);
    });

    it('should create a new cart if none exists when updating item', async () => {
      const mockNewCart = { id: 'newCart123', user_id: 'user123' };
      const mockUpdatedItem = { product_id: 'product123', quantity: 1 };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [] })  // No existing cart
        .mockResolvedValueOnce({ rows: [mockNewCart] })  // Create new cart
        .mockResolvedValueOnce({ rows: [mockUpdatedItem] });  // Item added

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        body: { product_id: 'product123', quantity: 1 },
        dbConnection,
      };

      const result = await cartService.updateItem(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockUpdatedItem);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item from the cart', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };
      const mockDeletedItem = { id: 'item123', product_id: 'product123' };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({ rows: [mockDeletedItem] });  // Item deleted

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        params: { itemId: 'item123' },
        dbConnection,
      };

      const result = await cartService.deleteItem(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockDeletedItem);
    });
  });

  describe('clearCart', () => {
    it('should clear all items in the cart', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({});  // Items cleared

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };

      const result = await cartService.clearCart(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ message: "Cart cleared successfully." });
    });
  });
});
