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
        .mockResolvedValueOnce({ rows: [] }) // No user cart merging needed
        .mockResolvedValueOnce({ rows: [mockCart] })
        .mockResolvedValueOnce({ rows: [] }) // Voucher check
        .mockResolvedValueOnce({ rows: [{ price_calculations: { vat_percentage: 20 }, items: [{ id: 'item1', product_name: 'Product 1' }] }] });
        
      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };

      const result = await cartService.getCart(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(4);
      expect(result.cart).toEqual(mockCart);
      expect(result.items).toEqual([{ id: 'item1', product_name: 'Product 1' }]);
      expect(result.vat_percentage).toEqual(20);
    });

    it('should create a new cart if none exists', async () => {
      const mockNewCart = { id: 'newCart123', user_id: 'user123', session_id: null };
      
      // Mock the getOrCreateCart method
      jest.spyOn(cartService, 'getOrCreateCart').mockResolvedValue(mockNewCart);
    
      dbConnection.query
        .mockResolvedValueOnce({ rows: [] })  // New cart
        .mockResolvedValueOnce({ rows: [{ price_calculations: { vat_percentage: 20 }, items: [] }] });
    
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
      expect(result.vat_percentage).toEqual(20);
    });

    it('should merge carts when user logs in with existing session cart and user cart', async () => {
      const sessionCart = { 
        id: 'sessionCart123', 
        session_id: 'session123', 
        user_id: null 
      };
      const userCart = { 
        id: 'userCart123', 
        user_id: 'user123', 
        session_id: null 
      };
      const mergedCartItems = { 
        price_calculations: { vat_percentage: 20 }, 
        items: [{ id: 'item1' }] 
      };
  
      // Mock sequence for cart merge scenario
      dbConnection.query
        .mockResolvedValueOnce({ rows: [sessionCart] }) // getOrCreateCart returns session cart
        .mockResolvedValueOnce({ rows: [userCart] }) // Find user's cart
        .mockResolvedValueOnce({ rows: [] }) // mergeCartsOnLogin first query
        .mockResolvedValueOnce({ rows: [] }) // mergeCartsOnLogin second query
        .mockResolvedValueOnce({ rows: [userCart] }) // getOrCreateCart in recursive call
        .mockResolvedValueOnce({ rows: [] }) // Voucher check
        .mockResolvedValueOnce({ rows: [mergedCartItems] }); // Get cart items
  
      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };
  
      const result = await cartService.getCart(data);
  
      expect(dbConnection.query).toHaveBeenCalledTimes(7);
      expect(result.cart).toEqual(userCart);
      expect(result.items).toEqual([{ id: 'item1' }]);
    });
  
    it('should assign session cart to user when logging in without existing user cart', async () => {
      const sessionCart = { 
        id: 'sessionCart123', 
        session_id: 'session123', 
        user_id: null 
      };
      const cartItems = { 
        price_calculations: { vat_percentage: 20 }, 
        items: [{ id: 'item1' }] 
      };
  
      dbConnection.query
        .mockResolvedValueOnce({ rows: [sessionCart] }) // getOrCreateCart returns session cart
        .mockResolvedValueOnce({ rows: [] }) // No existing user cart
        .mockResolvedValueOnce({ rows: [{ ...sessionCart, user_id: 'user123', session_id: null }] }) // Update cart
        .mockResolvedValueOnce({ rows: [] }) // Voucher check
        .mockResolvedValueOnce({ rows: [cartItems] }); // Get cart items
  
      const data = {
        session: { user_id: 'user123', id: 'session123' },
        dbConnection,
      };
  
      const result = await cartService.getCart(data);
  
      expect(dbConnection.query).toHaveBeenCalledTimes(5);
      expect(result.items).toEqual([{ id: 'item1' }]);
      // Verify cart was assigned to user
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE carts SET user_id = $1, session_id = NULL'),
        ['user123', sessionCart.id]
      );
    });
  
    it('should handle active voucher update in cart', async () => {
      const cart = { 
        id: 'cart123', 
        user_id: 'user123', 
        voucher_id: 1 
      };
      const voucher = {
        id: 1,
        is_active: true,
        start_date: new Date(Date.now() - 86400000), // yesterday
        end_date: new Date(Date.now() + 86400000), // tomorrow
        discount_amount: 10
      };
      const cartItems = { 
        price_calculations: { vat_percentage: 20 }, 
        items: [{ id: 'item1' }] 
      };
  
      dbConnection.query
        .mockResolvedValueOnce({ rows: [cart] }) // getOrCreateCart
        .mockResolvedValueOnce({ rows: [voucher] }) // Voucher check
        .mockResolvedValueOnce({ rows: [{ ...cart, voucher_discount_amount: voucher.discount_amount }] }) // Update voucher amount
        .mockResolvedValueOnce({ rows: [cartItems] }); // Get cart items
  
      const data = {
        session: { user_id: 'user123' },
        dbConnection,
      };
  
      const result = await cartService.getCart(data);
  
      expect(dbConnection.query).toHaveBeenCalledTimes(4);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE carts SET voucher_discount_amount = $1'),
        [voucher.discount_amount, cart.id]
      );
    });
  
    it('should remove expired voucher from cart', async () => {
      const cart = { 
        id: 'cart123', 
        user_id: 'user123', 
        voucher_id: 1 
      };
      const voucher = {
        id: 1,
        is_active: false, // inactive voucher
        start_date: new Date(),
        end_date: new Date(),
        discount_amount: 10
      };
      const cartItems = { 
        price_calculations: { vat_percentage: 20 }, 
        items: [{ id: 'item1' }] 
      };
  
      dbConnection.query
        .mockResolvedValueOnce({ rows: [cart] }) // getOrCreateCart
        .mockResolvedValueOnce({ rows: [voucher] }) // Voucher check
        .mockResolvedValueOnce({ rows: [{ ...cart, voucher_id: null, voucher_discount_amount: 0 }] }) // Remove voucher
        .mockResolvedValueOnce({ rows: [cartItems] }); // Get cart items
  
      const data = {
        session: { user_id: 'user123' },
        dbConnection,
      };
  
      const result = await cartService.getCart(data);
  
      expect(dbConnection.query).toHaveBeenCalledTimes(4);
      expect(dbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE carts SET voucher_id = NULL, voucher_discount_amount = 0'),
        [cart.id]
      );
    });
  });

  describe('updateItem', () => {
    it('should add or update an item in the cart', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };
      const mockUpdatedItem = { product_id: 'product123', quantity: 2 };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({ rows: [mockUpdatedItem] })  // Item updated
        .mockResolvedValueOnce({ rows: [] }); // Insert notification

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        body: { product_id: 'product123', quantity: 2 },
        dbConnection,
      };

      const result = await cartService.updateItem(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockUpdatedItem);
    });

    it('should create a new cart if none exists when updating item', async () => {
      const mockNewCart = { id: 'newCart123', user_id: 'user123' };
      const mockUpdatedItem = { product_id: 'product123', quantity: 1 };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [] })  // No existing cart
        .mockResolvedValueOnce({ rows: [mockNewCart] })  // Create new cart
        .mockResolvedValueOnce({ rows: [mockUpdatedItem] })  // Item added
        .mockResolvedValueOnce({ rows: [] }); // Insert notification

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        body: { product_id: 'product123', quantity: 1 },
        dbConnection,
      };

      const result = await cartService.updateItem(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(4);
      expect(result).toEqual(mockUpdatedItem);
    });
  });

  describe('deleteItem', () => {
    it('should delete an item from the cart', async () => {
      const mockCart = { id: 'cart123', user_id: 'user123' };
      const mockDeletedItem = { id: 'item123', product_id: 'product123' };

      dbConnection.query
        .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
        .mockResolvedValueOnce({ rows: [mockDeletedItem] })  // Item deleted
        .mockResolvedValueOnce({ rows: [] }); // Insert notification

      const data = {
        session: { user_id: 'user123', id: 'session123' },
        params: { itemId: 'item123' },
        dbConnection,
      };

      const result = await cartService.deleteItem(data);

      expect(dbConnection.query).toHaveBeenCalledTimes(3);
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
            .mockResolvedValueOnce({ rows: [] }) // No user cart merging needed
            .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
            .mockResolvedValueOnce({ rows: [] }) // Voucher check
            .mockResolvedValueOnce({ rows: [{ price_calculations: { vat_percentage: 20 }, items: [{ id: 'item1', product_name: 'Product 1' }] }] });

          const data = {
            session: { user_id: 'user123', id: 'session123' },
            dbConnection,
          };

          const result = await cartService.getCart(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(4);
          expect(result.cart).toEqual(mockCart);
          expect(result.items).toEqual([{ id: 'item1', product_name: 'Product 1' }]);
          expect(result.vat_percentage).toEqual(20);
        });

        it('should create a new cart if none exists', async () => {
          const mockNewCart = { id: 'newCart123', user_id: 'user123', session_id: null };
          
          // Mock the getOrCreateCart method
          jest.spyOn(cartService, 'getOrCreateCart').mockResolvedValue(mockNewCart);
        
          dbConnection.query
            .mockResolvedValueOnce({ rows: [] })  // No user cart merging needed
            .mockResolvedValueOnce({ rows: [{ price_calculations: { vat_percentage: 20 } }] });
        
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
          expect(result.vat_percentage).toEqual(20);
        });
        
      });

      describe('updateItem', () => {
        it('should add or update an item in the cart', async () => {
          const mockCart = { id: 'cart123', user_id: 'user123' };
          const mockUpdatedItem = { product_id: 'product123', quantity: 2 };

          dbConnection.query
            .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
            .mockResolvedValueOnce({ rows: [mockUpdatedItem] })  // Item updated
            .mockResolvedValueOnce({ rows: [] }); // Insert notification

          const data = {
            session: { user_id: 'user123', id: 'session123' },
            body: { product_id: 'product123', quantity: 2 },
            dbConnection,
          };

          const result = await cartService.updateItem(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(3);
          expect(result).toEqual(mockUpdatedItem);
        });

        it('should create a new cart if none exists when updating item', async () => {
          const mockNewCart = { id: 'newCart123', user_id: 'user123' };
          const mockUpdatedItem = { product_id: 'product123', quantity: 1 };

          dbConnection.query
            .mockResolvedValueOnce({ rows: [] })  // No existing cart
            .mockResolvedValueOnce({ rows: [mockNewCart] })  // Create new cart
            .mockResolvedValueOnce({ rows: [mockUpdatedItem] })  // Item added
            .mockResolvedValueOnce({ rows: [] }); // Insert notification

          const data = {
            session: { user_id: 'user123', id: 'session123' },
            body: { product_id: 'product123', quantity: 1 },
            dbConnection,
          };

          const result = await cartService.updateItem(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(4);
          expect(result).toEqual(mockUpdatedItem);
        });
      });

      describe('deleteItem', () => {
        it('should delete an item from the cart', async () => {
          const mockCart = { id: 'cart123', user_id: 'user123' };
          const mockDeletedItem = { id: 'item123', product_id: 'product123' };

          dbConnection.query
            .mockResolvedValueOnce({ rows: [mockCart] })  // Existing cart
            .mockResolvedValueOnce({ rows: [mockDeletedItem] })  // Item deleted
            .mockResolvedValueOnce({ rows: [] }); // Insert notification
          
          const data = {
            session: { user_id: 'user123', id: 'session123' },
            params: { itemId: 'item123' },
            dbConnection,
          };

          const result = await cartService.deleteItem(data);

          expect(dbConnection.query).toHaveBeenCalledTimes(3);
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

    describe('getActiveVouchers', () => {
      it('should return available vouchers for user', async () => {
        const mockVouchers = [
          { id: 1, code: 'VOUCHER1', discount_amount: 10 },
          { id: 2, code: 'VOUCHER2', discount_amount: 20 }
        ];
    
        dbConnection.query.mockResolvedValueOnce({ rows: mockVouchers });
    
        const data = {
          session: { user_id: 'user123' },
          dbConnection
        };
    
        const result = await cartService.getActiveVouchers(data);
    
        expect(dbConnection.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT vouchers.* FROM vouchers'),
          [data.session.user_id]
        );
        expect(result).toEqual(mockVouchers);
      });
    
      it('should return empty array when no vouchers available', async () => {
        dbConnection.query.mockResolvedValueOnce({ rows: [] });
    
        const data = {
          session: { user_id: 'user123' },
          dbConnection
        };
    
        const result = await cartService.getActiveVouchers(data);
        expect(result).toEqual([]);
      });
    });
    
    describe('applyVoucher', () => {
      it('should successfully apply valid voucher to cart', async () => {
        const mockCart = { id: 'cart123', user_id: 'user123' };
        const mockVoucher = { 
          id: 1, 
          code: 'VALID10', 
          discount_amount: 10,
          is_active: true 
        };
    
        dbConnection.query
          .mockResolvedValueOnce({ rows: [mockCart] }) // getOrCreateCart
          .mockResolvedValueOnce({ rows: [mockVoucher] }) // voucher lookup
          .mockResolvedValueOnce({ rows: [] }) // voucher usage check
          .mockResolvedValueOnce({ rows: [{ ...mockCart, voucher_id: mockVoucher.id }] }); // update cart
    
        const data = {
          session: { user_id: 'user123' },
          body: { code: 'VALID10' },
          dbConnection
        };
    
        const result = await cartService.applyVoucher(data);
    
        expect(dbConnection.query).toHaveBeenCalledTimes(4);
        expect(result).toEqual({ message: 'Voucher applied successfully.' });
      });
    
      it('should throw error for invalid voucher code', async () => {
        const mockCart = { id: 'cart123', user_id: 'user123' };
    
        dbConnection.query
          .mockResolvedValueOnce({ rows: [mockCart] }) // getOrCreateCart
          .mockResolvedValueOnce({ rows: [] }); // voucher lookup (not found)
    
        const data = {
          session: { user_id: 'user123' },
          body: { code: 'INVALID' },
          dbConnection
        };
    
        await expect(cartService.applyVoucher(data))
          .rejects
          .toThrow('Invalid voucher code');
      });
    
      it('should throw error for already used voucher', async () => {
        const mockCart = { id: 'cart123', user_id: 'user123' };
        const mockVoucher = { 
          id: 1, 
          code: 'USED10', 
          discount_amount: 10 
        };
    
        dbConnection.query
          .mockResolvedValueOnce({ rows: [mockCart] }) // getOrCreateCart
          .mockResolvedValueOnce({ rows: [mockVoucher] }) // voucher lookup
          .mockResolvedValueOnce({ rows: [{ user_id: 'user123' }] }); // voucher usage (found)
    
        const data = {
          session: { user_id: 'user123' },
          body: { code: 'USED10' },
          dbConnection
        };
    
        await expect(cartService.applyVoucher(data))
          .rejects
          .toThrow('Voucher already used');
      });
    });
    
    describe('removeVoucher', () => {
      it('should successfully remove voucher from cart', async () => {
        const mockCart = { 
          id: 'cart123', 
          user_id: 'user123',
          voucher_id: 1 
        };
    
        dbConnection.query
          .mockResolvedValueOnce({ rows: [mockCart] }) // getOrCreateCart
          .mockResolvedValueOnce({ rows: [{ ...mockCart, voucher_id: null }] }); // update cart
    
        const data = {
          session: { user_id: 'user123' },
          dbConnection
        };
    
        const result = await cartService.removeVoucher(data);
    
        expect(dbConnection.query).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ message: 'Voucher removed successfully.' });
      });
    
      it('should throw error when no voucher is applied', async () => {
        const mockCart = { 
          id: 'cart123', 
          user_id: 'user123',
          voucher_id: null 
        };
    
        dbConnection.query
          .mockResolvedValueOnce({ rows: [mockCart] }); // getOrCreateCart
    
        const data = {
          session: { user_id: 'user123' },
          dbConnection
        };
    
        await expect(cartService.removeVoucher(data))
          .rejects
          .toThrow('No voucher applied');
      });
    });
});

function containsQueryString(actualQuery, expectedQuery) {
  const normalize = (str) => str.trim().replace(/\s+/g, " ");
  return normalize(actualQuery).includes(normalize(expectedQuery));
}