const OrderService = require('./orderService');
const { STATUS_CODES } = require('../serverConfigurations/constants');
const paypal = require('@paypal/checkout-server-sdk');

jest.mock('@paypal/checkout-server-sdk');

describe('OrderService', () => {
    let orderService;
    let mockEmailService;
    let mockPaypalClient;
    let mockDbConnection;

    beforeEach(() => {
        mockEmailService = {
            sendOrderCreatedConfirmationEmail: jest.fn(),
            sendOrderPaidConfirmationEmail: jest.fn(),
            queueEmail: jest.fn(),
        };
        mockPaypalClient = {
            execute: jest.fn(),
        };
        mockDbConnection = {
            query: jest.fn(),
        };

        orderService = new OrderService(mockEmailService, mockPaypalClient);
    });

    describe('createOrder', () => {
        it('should create an order successfully', async () => {
            const data = {
                session: { user_id: 1 },
                body: {
                    address: {
                        street: '123 Main St',
                        city: 'Anytown',
                        country_id: 1,
                    },
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };

            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // addressResult
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // orderResult
                .mockResolvedValueOnce({ rows: [] }) // voucherResult
                .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 2, unit_price: 10, name: 'Product 1' }] }) // cartResult
                .mockResolvedValueOnce({ rows: [{ quantity: 10, name: 'Product 1', id: 1, product_name: 'Product 1' }] }) // inventoryResult
                .mockResolvedValueOnce({ rows: []}) // Update
                .mockResolvedValueOnce({ rows: []}) // Update
                .mockResolvedValueOnce({ rows: []}) // Update
                .mockResolvedValueOnce({ rows: [{ id: 1, total_price_with_vat: 22 }] }) // orderViewResult
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paymentResult
                .mockResolvedValueOnce({ rows: [{ email: 'abv@abv.bg', first_name: 'Ivan', last_name: 'Ivanov' }] });

            mockPaypalClient.execute.mockResolvedValue({
                result: {
                    id: 'PAYPAL_ORDER_ID',
                    links: [{ rel: 'approve', href: 'http://approval.url' }],
                },
            });

            jest.spyOn(orderService, "verifyCartPricesAreUpToDate").mockResolvedValue(true);

            const result = await orderService.createOrder(data);

            expect(result).toEqual({
                approvalUrl: 'http://approval.url',
                message: 'Order placed successfully',
                orderId: 1,
            });

            expect(mockDbConnection.query).toHaveBeenCalledTimes(11);
            expect(mockEmailService.queueEmail).toHaveBeenCalledTimes(1);
        });

        it('should throw an error if cart is empty', async () => {
            const data = {
                session: { user_id: 1 },
                body: {
                    address: {
                        street: '123 Main St',
                        city: 'Anytown',
                        country_id: 1,
                    },
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };

            jest.spyOn(orderService, "verifyCartPricesAreUpToDate").mockResolvedValue(true);

            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // addressResult
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // orderResult
                .mockResolvedValueOnce({ rows: [] }) // voucherResult
                .mockResolvedValueOnce({ rows: [] }); // cartResult

            await expect(orderService.createOrder(data)).rejects.toThrow('Cart is empty');

            expect(mockDbConnection.query).toHaveBeenCalledTimes(4);
            expect(mockEmailService.sendOrderCreatedConfirmationEmail).not.toHaveBeenCalled();
        });

        it('should throw an error if not enough stock for a product', async () => {
            const data = {
                session: { user_id: 1 },
                body: {
                    address: {
                        street: '123 Main St',
                        city: 'Anytown',
                        country_id: 1,
                    },
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };

            jest.spyOn(orderService, "verifyCartPricesAreUpToDate").mockResolvedValue(true);

            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // addressResult
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // orderResult
                .mockResolvedValueOnce({ rows: [] }) // voucherResult
                .mockResolvedValueOnce({ rows: [{ product_id: 1, quantity: 2, unit_price: 10, name: 'Product 1' }] }) // cartResult
                .mockResolvedValueOnce({ rows: [{ quantity: 1, name: 'Product 1', id: 1 }] }); // inventoryResult

            await expect(orderService.createOrder(data)).rejects.toThrow('Not enough stock for product Product 1');

            expect(mockDbConnection.query).toHaveBeenCalledTimes(5);
            expect(mockEmailService.sendOrderCreatedConfirmationEmail).not.toHaveBeenCalled();
        });
    });

    describe('createOrderByStaff', () => {
        it('should create an order successfully', async () => {
            const data = {
                body: {
                    user_id: 1,
                    order_status: 'Pending',
                    order_items: [
                        { id: 1, quantity: 2 }
                    ],
                    street: '123 Main St',
                    city: 'Anytown',
                    country_id: 1
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1, total_price: 20 }] }) // orderResult
                .mockResolvedValueOnce({ rows: [{ price: 10 }] }) // productResult
                .mockResolvedValueOnce({ rows: [] }) // order items insert
                .mockResolvedValueOnce({ rows: [] }) // inventory update
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // addressResult
                .mockResolvedValueOnce({ rows: [] }); // shipping address update
    
            const result = await orderService.createOrderByStaff(data);
    
            expect(result).toEqual({
                order: { id: 1, total_price: 20 },
                message: "Order created successfully"
            });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(6);
        });
    
        it('should throw error when product does not exist', async () => {
            const data = {
                body: {
                    user_id: 1,
                    order_status: 'Pending',
                    order_items: [
                        { id: 999, quantity: 2 }
                    ],
                    street: '123 Main St',
                    city: 'Anytown',
                    country_id: 1
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1, total_price: 20 }] }) // orderResult
                .mockResolvedValueOnce({ rows: [] }); // productResult (empty - product not found)
    
            await expect(orderService.createOrderByStaff(data))
                .rejects.toThrow();
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(2);
        });
    
        it('should throw error for insufficient inventory', async () => {
            const data = {
                body: {
                    user_id: 1,
                    order_status: 'Pending',
                    order_items: [
                        { id: 1, quantity: 100 }
                    ],
                    street: '123 Main St',
                    city: 'Anytown',
                    country_id: 1
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1, total_price: 1000 }] }) // orderResult
                .mockResolvedValueOnce({ rows: [{ price: 10 }] }) // productResult
                .mockResolvedValueOnce({ rows: [] }) // order items insert
                .mockRejectedValueOnce(new Error('Insufficient inventory')); // inventory update fails
    
            await expect(orderService.createOrderByStaff(data))
                .rejects.toThrow('Insufficient inventory');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(4);
        });
    
        it('should validate required fields', async () => {
            const data = {
                body: {
                    user_id: 1,
                    // missing order_status
                    order_items: [
                        { id: 1, quantity: 2 }
                    ],
                    street: '123 Main St',
                    city: 'Anytown',
                    country_id: 1
                },
                dbConnection: mockDbConnection,
                context:{
                    settings: {
                        vat_percentage: 10
                    }
                }
            };
    
            mockDbConnection.query
                .mockRejectedValueOnce(new Error('null value in column "status" violates not-null constraint'));
    
            await expect(orderService.createOrderByStaff(data))
                .rejects.toThrow();
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
        });
    });

    describe('updateOrderByStaff', () => {
        it('should update order status only when order is not pending', async () => {
            const data = {
                params: { orderId: 1 },
                body: {
                    order_status: 'Shipped',
                    order_items: [
                        { product_id: 1, quantity: 2 }
                    ]
                }
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }) // Update order status
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        status: 'Paid',
                        order_items: [{ product_id: 1, quantity: 2 }]
                    }] 
                }); // Select from orders_view
    
            const result = await orderService.updateOrderByStaff({ ...data, dbConnection: mockDbConnection });
    
            expect(result).toEqual({ message: 'Order updated successfully' });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(2);
        });
    
        it('should throw error when trying to modify items of non-pending order', async () => {
            const data = {
                params: { orderId: 1 },
                body: {
                    order_status: 'Shipped',
                    order_items: [
                        { product_id: 1, quantity: 3 } // Different quantity
                    ]
                }
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }) // Update order status
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        status: 'Paid',
                        order_items: [{ product_id: 1, quantity: 2 }]
                    }] 
                }); // Select from orders_view
    
            await expect(orderService.updateOrderByStaff({ ...data, dbConnection: mockDbConnection }))
                .rejects.toThrow('Order items cannot be changed');
        });

        it('should update pending order with modified items', async () => {
            const data = {
                params: { orderId: 1 },
                body: {
                    order_status: 'Pending',
                    order_items: [
                        { product_id: 1, quantity: 3 },
                        { id: 2, quantity: 1 }
                    ],
                    street: 'New Street',
                    city: 'New City',
                    country_id: 2
                },
                dbConnection: mockDbConnection
            };
        
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }) // Update order status
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        status: 'Pending',
                        order_items: [
                            { product_id: 1, quantity: 2 },
                            { product_id: 3, quantity: 1 }
                        ]
                    }] 
                }) // Select from orders_view
                .mockResolvedValueOnce({ rows: [] }) // Update inventory for removed item
                .mockResolvedValueOnce({ rows: [] }) // Delete removed item
                .mockResolvedValueOnce({ rows: [{ price: 10, id: 1 }] }) // Get product price
                .mockResolvedValueOnce({ rows: [] }) // Update inventory
                .mockResolvedValueOnce({ rows: [{ price: 20, id: 2 }] }) // Get product price for new item
                .mockResolvedValueOnce({ rows: [] }) // Update order total price
                .mockResolvedValueOnce({ rows: [] }); // Update shipping address
        
            const result = await orderService.updateOrderByStaff(data);
        
            expect(result).toEqual({ message: 'Order updated successfully' });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(11);
        });
    });

    describe('getOrder', () => {
        it('should return order and items when found', async () => {
            const data = {
                params: { orderId: 1 },
                session: { user_id: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        user_id: 1,
                        total_price: 100,
                        status: 'Pending'
                    }]
                }) // orderResult
                .mockResolvedValueOnce({ 
                    rows: [
                        { 
                            id: 1,
                            product_id: 1,
                            quantity: 2,
                            unit_price: 50,
                            product_name: 'Test Product'
                        }
                    ]
                }); // orderItemsResult
    
            const result = await orderService.getOrder(data);
    
            expect(result).toEqual({
                order: {
                    id: 1,
                    user_id: 1,
                    total_price: 100,
                    status: 'Pending'
                },
                items: [{
                    id: 1,
                    product_id: 1,
                    quantity: 2,
                    unit_price: 50,
                    product_name: 'Test Product'
                }]
            });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(2);
        });
    
        it('should throw error when order is not found', async () => {
            const data = {
                params: { orderId: 999 },
                session: { user_id: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }); // orderResult empty
    
            await expect(orderService.getOrder(data))
                .rejects.toThrow('Order not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
        });
    
        it('should not return order for wrong user', async () => {
            const data = {
                params: { orderId: 1 },
                session: { user_id: 2 }, // Different user
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }); // No rows returned due to user_id mismatch
    
            await expect(orderService.getOrder(data))
                .rejects.toThrow('Order not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
            expect(mockDbConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE o.id = $1 AND o.user_id = $2'),
                [1, 2]
            );
        });
    });

    describe('capturePaypalPayment', () => {
        it('should capture payment successfully', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection,
                session: { user_id: 1 }
            };
    
            const mockOrder = {
                id: 1,
                total_price_with_vat: 100,
                order_items: [{ id: 1, quantity: 2 }]
            };
    
            const mockPayment = {
                id: 1,
                payment_hash: 'PAYMENT123'
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [mockOrder] }) // orderViewResult
                .mockResolvedValueOnce({ rows: [mockPayment] }) // paymentResult
                .mockResolvedValueOnce({ rows: [] }) // Update orders
                .mockResolvedValueOnce({ rows: [] }) // Update orders
                .mockResolvedValueOnce({ rows: [{ email: 'abv@abv.bg', first_name: 'Ivan', last_name: 'Ivanov' }] });

    
            mockPaypalClient.execute.mockResolvedValueOnce({
                result: { status: 'COMPLETED' }
            });
    
            const result = await orderService.capturePaypalPayment(data);
    
            expect(result).toEqual({ message: 'Payment completed successfully' });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(5);
            expect(mockEmailService.queueEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    emailData: {
                        first_name: 'Ivan',
                        last_name: 'Ivanov',
                        order_number: 1,
                        order_table: mockOrder,
                        payment_number: 'PAYMENT123',
                        recipient: undefined,
                        templateType: 'Order paid'
                    }
                })
            );
        });
    
        it('should throw error when order not found', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }); // orderViewResult empty
    
            await expect(orderService.capturePaypalPayment(data))
                .rejects.toThrow('Order not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
            expect(mockEmailService.sendOrderPaidConfirmationEmail).not.toHaveBeenCalled();
        });
    
        it('should throw error when payment not found', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // orderViewResult
                .mockResolvedValueOnce({ rows: [] }); // paymentResult empty
    
            await expect(orderService.capturePaypalPayment(data))
                .rejects.toThrow('Payment not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(2);
            expect(mockEmailService.sendOrderPaidConfirmationEmail).not.toHaveBeenCalled();
        });
    
        it('should throw error when PayPal capture fails', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [{ id: 1, total_price_with_vat: 100 }] }) // orderViewResult
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // paymentResult
                .mockResolvedValueOnce({ rows: [] }); // Update orders
    
            mockPaypalClient.execute.mockResolvedValueOnce({
                result: { status: 'FAILED' }
            });
    
            await expect(orderService.capturePaypalPayment(data))
                .rejects.toThrow('Payment failed');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(3);
            expect(mockEmailService.sendOrderPaidConfirmationEmail).not.toHaveBeenCalled();
        });
    });

    describe('cancelPaypalPayment', () => {
        it('should cancel payment successfully', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        status: 'Pending',
                        order_id: 1
                    }] 
                }) // paymentResult
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1,
                        status: 'Pending'
                    }] 
                }) // orderViewResult
                .mockResolvedValueOnce({ rows: [] }) // Update order status
                .mockResolvedValueOnce({ rows: [] }); // Update payment status
    
            const result = await orderService.cancelPaypalPayment(data);
    
            expect(result).toEqual({ message: 'Payment cancelled successfully' });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(4);
        });
    
        it('should throw error when payment not found', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }); // paymentResult empty
    
            await expect(orderService.cancelPaypalPayment(data))
                .rejects.toThrow('Payment not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
        });
    
        it('should throw error when payment status is not pending', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        status: 'Paid' // Not Pending
                    }] 
                }); // paymentResult
    
            await expect(orderService.cancelPaypalPayment(data))
                .rejects.toThrow('Payment status cannot be changed');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
        });
    
        it('should throw error when order not found', async () => {
            const data = {
                query: { token: 'TEST_TOKEN' },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        status: 'Pending' 
                    }] 
                }) // paymentResult
                .mockResolvedValueOnce({ rows: [] }); // orderViewResult empty
    
            await expect(orderService.cancelPaypalPayment(data))
                .rejects.toThrow('Order not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(2);
        });
    });

    describe('verifyCartPricesAreUpToDate', () => {
        it('should pass when cart prices are up to date', async () => {
            const data = {
                session: { user_id: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [
                        { product_id: 1, unit_price: 10, price: 10 },
                        { product_id: 2, unit_price: 20, price: 20 }
                    ] 
                }) // cartResult
                .mockResolvedValueOnce({ rows: [{ price: 10 }] }) // productResult for item 1
                .mockResolvedValueOnce({ rows: [{ price: 20 }] }); // productResult for item 2
    
            await expect(orderService.verifyCartPricesAreUpToDate(data))
                .resolves.not.toThrow();
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(3);
        });
    
        it('should throw error when cart prices have changed', async () => {
            const data = {
                session: { user_id: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [
                        { product_id: 1, unit_price: 10, price: 10 },
                        { product_id: 2, unit_price: 20, price: 25 } // Price changed
                    ] 
                }) // cartResult
                .mockResolvedValueOnce({ rows: [{ price: 10 }] }) // productResult for item 1
                .mockResolvedValueOnce({ rows: [{ price: 25 }] }) // productResult for item 2
                .mockResolvedValueOnce({ rows: [] }) // Update cart item price
                .mockResolvedValueOnce({ rows: [] }); // Commit
    
            await expect(orderService.verifyCartPricesAreUpToDate(data))
                .rejects.toThrow('Prices in your cart have changed');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(5);
        });
    
        it('should pass with empty cart', async () => {
            const data = {
                session: { user_id: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] }); // Empty cartResult
    
            await expect(orderService.verifyCartPricesAreUpToDate(data))
                .resolves.not.toThrow();
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
        });
    
        it('should update multiple prices when several have changed', async () => {
            const data = {
                session: { user_id: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [
                        { product_id: 1, unit_price: 10, price: 15 }, // Changed
                        { product_id: 2, unit_price: 20, price: 25 }, // Changed
                        { product_id: 3, unit_price: 30, price: 30 }  // Same
                    ] 
                }) // cartResult
                .mockResolvedValueOnce({ rows: [{ price: 15 }] }) // productResult for item 1
                .mockResolvedValueOnce({ rows: [] }) // Update cart item 1
                .mockResolvedValueOnce({ rows: [{ price: 25 }] }) // productResult for item 2
                .mockResolvedValueOnce({ rows: [] }) // Update cart item 2
                .mockResolvedValueOnce({ rows: [{ price: 30 }] }) // productResult for item 3
                .mockResolvedValueOnce({ rows: [] }); // Commit
    
            await expect(orderService.verifyCartPricesAreUpToDate(data))
                .rejects.toThrow('Prices in your cart have changed');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(7);
        });
    });

    describe('deleteOrder', () => {
        it('should soft delete order successfully', async () => {
            const data = {
                params: { orderId: 1 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ 
                    rows: [{ 
                        id: 1, 
                        is_active: false 
                    }] 
                });
    
            const result = await orderService.deleteOrder(data);
    
            expect(result).toEqual({ message: 'Order deleted successfully' });
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
            
        });
    
        it('should throw error when order not found', async () => {
            const data = {
                params: { orderId: 999 },
                dbConnection: mockDbConnection
            };
    
            mockDbConnection.query
                .mockResolvedValueOnce({ rows: [] });
    
            await expect(orderService.deleteOrder(data))
                .rejects.toThrow('Order not found');
    
            expect(mockDbConnection.query).toHaveBeenCalledTimes(1);
        });
    });
});