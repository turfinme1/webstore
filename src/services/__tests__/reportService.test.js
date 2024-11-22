const ReportService = require('../reportService');
describe('ReportService', () => {
    describe('getOrdersByUserReport', () => {
        let reportService;
        let mockDbConnection;

        beforeEach(() => {
            reportService = new ReportService();
            mockDbConnection = {
                query: jest.fn()
            };
        });

        it('should generate correct SQL with no filters', async () => {
            const data = {
                body: {},
                dbConnection: mockDbConnection
            };

            mockDbConnection.query.mockResolvedValue({ rows: [] });

            await reportService.getOrdersByUserReport(data);

            expect(mockDbConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['0', '9999999']
            );
        });

        it('should generate correct SQL with all filters', async () => {
            const data = {
                body: {
                    user_name: 'test@email.com',
                    user_id: '1',
                    order_total_min: '100',
                    order_total_max: '1000'
                },
                dbConnection: mockDbConnection
            };

            mockDbConnection.query.mockResolvedValue({ rows: [] });

            await reportService.getOrdersByUserReport(data);

            expect(mockDbConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['test@email.com', '1', '100', '1000']
            );
        });

        it('should return query results', async () => {
            const mockRows = [{ id: 1 }];
            mockDbConnection.query.mockResolvedValue({ rows: mockRows });

            const result = await reportService.getOrdersByUserReport({
                body: {},
                dbConnection: mockDbConnection
            });

            expect(result).toEqual(mockRows);
        });

        it('should handle filters with no grouping expression', async () => {
            const data = {
                body: {
                    order_total_min: '100'
                },
                dbConnection: mockDbConnection
            };

            mockDbConnection.query.mockResolvedValue({ rows: [] });

            await reportService.getOrdersByUserReport(data);

            expect(mockDbConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                ['100', '9999999']
            );
        });
    });
});