// paypalClient.test.js
const { STATUS_CODES } = require('../constants');
// const { PayPalHttpClient, OrdersCreateRequest, OrdersCaptureRequest, OrdersGetRequest } = require('../serverConfigurations/paypalClient');
const paypal = require("../paypalClient");

describe('PayPalHttpClient', () => {
    let paypalClient;
    let originalFetch;

    beforeEach(() => {
        paypalClient = new paypal.core.PayPalHttpClient('test_client_id', 'test_client_secret');
        originalFetch = global.fetch;
        global.fetch = jest.fn();
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('getAccessToken', () => {
        it('should get access token successfully', async () => {
            const mockToken = 'mock_access_token';
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ access_token: mockToken })
            });

            const token = await paypalClient.getAccessToken();
            
            expect(token).toBe(mockToken);
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api-m.sandbox.paypal.com/v1/oauth2/token',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': expect.any(String)
                    })
                })
            );
        });

        it('should cache access token', async () => {
            const mockToken = 'mock_access_token';
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ access_token: mockToken })
            });

            await paypalClient.getAccessToken();
            await paypalClient.getAccessToken();

            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('execute', () => {
        beforeEach(() => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ access_token: 'mock_token' })
            });
        });

        it('should execute OrdersCreateRequest successfully', async () => {
            const request = new paypal.orders.OrdersCreateRequest();
            request.body = { test: 'data' };
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ id: 'ORDER_ID' })
            });

            const result = await paypalClient.execute(request);

            expect(result.result).toEqual({ id: 'ORDER_ID' });
            expect(global.fetch).toHaveBeenLastCalledWith(
                'https://api-m.sandbox.paypal.com/v2/checkout/orders',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock_token'
                    }),
                    body: JSON.stringify({ test: 'data' })
                })
            );
        });

        it('should execute OrdersCaptureRequest successfully', async () => {
            const request = new paypal.orders.OrdersCaptureRequest('ORDER_ID');
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 'COMPLETED' })
            });

            const result = await paypalClient.execute(request);

            expect(result.result).toEqual({ status: 'COMPLETED' });
            expect(global.fetch).toHaveBeenLastCalledWith(
                'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER_ID/capture',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock_token'
                    })
                })
            );
        });

        it('should execute OrdersGetRequest successfully', async () => {
            const request = new paypal.orders.OrdersGetRequest('ORDER_ID');
            
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ status: 'PENDING' })
            });

            const result = await paypalClient.execute(request);

            expect(result.result).toEqual({ status: 'PENDING' });
            expect(global.fetch).toHaveBeenLastCalledWith(
                'https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER_ID',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer mock_token'
                    })
                })
            );
        });

        it('should throw error for invalid request type', async () => {
            const invalidRequest = {};
            
            await expect(paypalClient.execute(invalidRequest))
                .rejects
                .toThrow('Invalid type of request');
        });

        it('should throw error when PayPal API fails', async () => {
            const request = new paypal.orders.OrdersCreateRequest();
            request.body = { test: 'data' };
            
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                json: () => Promise.resolve({ error: 'Bad Request' })
            });

            await expect(paypalClient.execute(request))
                .rejects
                .toThrow('There was an error processing the request');
        });
    });
});