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

  describe('getOrCreateCart', () => {
    it('should create a new cart if there is no cart', async () => {
      const mockCart = { id: "newCart123", session_id: "user123" };
  
      dbConnection.query.mockResolvedValueOnce({ rows: [] });
  
      dbConnection.query.mockResolvedValueOnce({ rows: [mockCart] });
  
      const data = {
        session: { session_id: "user123", id: "session123" },
        dbConnection,
      };
  
      const result = await cartService.getOrCreateCart(data);
  
      expect(dbConnection.query).toHaveBeenCalledTimes(2);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO carts"),
        expect.any(Array)
      );
      expect(result).toEqual(mockCart);
    });
  });

  describe('getCart', () => {
    it('should return an existing cart with items', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };
      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({ rows: [{ id: 'item1', product_name: 'Product 1' }] })
        .mockResolvedValueOnce({ rows: [{ vat_percentage: 20 }] });

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };

      const result = await cartService.getCart(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(3);
      expect(result.cart).toEqual(mockCart);
      expect(result.items).toEqual([{ id: 'item1', product_name: 'Product 1' }]);
      expect(result.vatPercentage).toEqual(20);
    });

    it('should create a new cart if none exists', async () => {
      const mockNewCart = { id: 'newCart123', user_id: 'user123', session_id: null };
      
      // Mock the getOrCreateCart method
      jest.spyOn(cartService, 'getOrCreateCart').mockResolvedValue(mockNewCart);
    
      dbConnection.query
        .mockResolvedValueOnce({ rows: [] })  // No user cart merging needed
        .mockResolvedValueOnce({ rows: [{ vat_percentage: 20 }] });
    
      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };
    
      const result = await cartService.getCart(data);
    
      // Expect that getOrCreateCart was called instead of being tested here
      expect(cartService.getOrCreateCart).toHaveBeenCalledWith(data);
      expect(dbConnection.query).toHaveBeenCalledTimes(2);  // The number of db queries related to the cart items only
      expect(result.cart).toEqual(mockNewCart);
      expect(result.items).toEqual([]);
      expect(result.vatPercentage).toEqual(20);
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

      describe('getCart', () => {
        it('should return an existing cart with items', async () => {
          const mockCart = { id: 'cart123', user_id: 'user123' };
          dbConnection.query
            .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
            .mockResolvedValueOnce({ rows: [{ id: 'item1', product_name: 'Product 1' }] })
            .mockResolvedValueOnce({ rows: [{ vat_percentage: 20 }] });

          const data = {
            session: { user_id: 'user123', id: 'session123' },
            dbConnection,
          };

          const result = await cartService.getCart(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(3);
          expect(result.cart).toEqual(mockCart);
          expect(result.items).toEqual([{ id: 'item1', product_name: 'Product 1' }]);
          expect(result.vatPercentage).toEqual(20);
        });

        it('should create a new cart if none exists', async () => {
          const mockNewCart = { id: 'newCart123', user_id: 'user123', session_id: null };
          
          // Mock the getOrCreateCart method
          jest.spyOn(cartService, 'getOrCreateCart').mockResolvedValue(mockNewCart);
        
          dbConnection.query
            .mockResolvedValueOnce({ rows: [] })  // No user cart merging needed
            .mockResolvedValueOnce({ rows: [{ vat_percentage: 20 }] });
        
          const data = {
            session: { user_id: 'user123', id: 'session123' },
            dbConnection,
          };
        
          const result = await cartService.getCart(data);
        
          // Expect that getOrCreateCart was called instead of being tested here
          expect(cartService.getOrCreateCart).toHaveBeenCalledWith(data);
          expect(dbConnection.query).toHaveBeenCalledTimes(2);  // The number of db queries related to the cart items only
          expect(result.cart).toEqual(mockNewCart);
          expect(result.items).toEqual([]);
          expect(result.vatPercentage).toEqual(20);
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

      describe('getOrCreateCart', () => {
        it('should return an existing cart if one exists', async () => {
          const mockCart = { id: 'cart123', user_id: 'user123' };

          dbConnection.query.mockResolvedValueOnce({ rows: [mockCart] });

          const data = {
            session: { user_id: 'user123', id: 'session123' },
            dbConnection,
          };

          const result = await cartService.getOrCreateCart(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(1);
          expect(result).toEqual(mockCart);
        });

        it('should create a new cart if none exists', async () => {
          const mockNewCart = { id: 'newCart123', user_id: 'user123' };

          dbConnection.query
            .mockResolvedValueOnce({ rows: [] })  // No existing cart
            .mockResolvedValueOnce({ rows: [mockNewCart] });  // Create new cart

          const data = {
            session: { user_id: 'user123', id: 'session123' },
            dbConnection,
          };

          const result = await cartService.getOrCreateCart(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(2);
          expect(result).toEqual(mockNewCart);
        });
      });

      describe('mergeCartsOnLogin', () => {
        it('should merge session cart items into user cart', async () => {
          const sessionCart = { id: 'sessionCart123' };
          const userCart = { id: 'userCart123' };

          dbConnection.query.mockResolvedValueOnce({});

          await cartService.mergeCartsOnLogin(sessionCart, userCart, dbConnection);

          expect(dbConnection.query).toHaveBeenCalledTimes(2);
          expect(dbConnection.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO cart_items'), [userCart.id, sessionCart.id]);
          expect(dbConnection.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE carts SET is_active = FALSE'), [sessionCart.id]);
        });

        it('should do nothing if sessionCart or userCart is missing', async () => {
          await cartService.mergeCartsOnLogin(null, { id: 'userCart123' }, dbConnection);
          await cartService.mergeCartsOnLogin({ id: 'sessionCart123' }, null, dbConnection);

          expect(dbConnection.query).not.toHaveBeenCalled();
        });
      });
    });
});

function containsQueryString(actualQuery, expectedQuery) {
  const normalize = (str) => str.trim().replace(/\s+/g, " ");
  return normalize(actualQuery).includes(normalize(expectedQuery));
}