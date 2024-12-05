const { STATUS_CODES } = require('../../serverConfigurations/constants');
const ReportService = require('../reportService');

describe('ReportService', () => {
    let reportService;
    let mockDbConnection;
    let mockExportService;

    beforeEach(() => {
        mockExportService = {
            exportReport: jest.fn()
        };
        reportService = new ReportService(mockExportService);
        mockDbConnection = {
            query: jest.fn()
        };
    });

    describe('getReport', () => {
        const mockEntitySchema = {
            reportUI: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    dataEndpoint: { type: 'string' },
                    filters: { type: 'array' },
                    tableTemplate: { type: 'string' },
                    headerGroups: { type: 'array' },
                    columns: { type: 'array' }
                }
            }
        };

        it('should return metadata for report when metadataRequest is true', async () => {
            const data = {
                body: { metadataRequest: true },
                params: { report: 'report-orders' },
                dbConnection: mockDbConnection,
                entitySchemaCollection: mockEntitySchema
            };

            const result = await reportService.getReport(data);

            expect(result).toHaveProperty('reportUIConfig');
            expect(result).toHaveProperty('sql');
            expect(result).toHaveProperty('reportFilters');
            expect(result).toHaveProperty('INPUT_DATA');
        });

        it('should execute query and return results when metadataRequest is false', async () => {
            const mockRows = [{ id: 1 }];
            mockDbConnection.query.mockResolvedValue({ rows: mockRows });

            const data = {
                body: {},
                params: { report: 'report-orders' },
                dbConnection: mockDbConnection,
                context: {
                    settings: { report_row_limit_display: 10 }
                },
                entitySchemaCollection: mockEntitySchema
            };

            const result = await reportService.getReport(data);

            expect(result).toHaveProperty('rows', mockRows);
            expect(result).toHaveProperty('overRowDisplayLimit');
            expect(mockDbConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.any(Array)
            );
        });

        it('should handle filters correctly', async () => {
            mockDbConnection.query.mockResolvedValue({ rows: [] });

            const data = {
                body: {
                    status: 'Paid',
                    created_at_minimum: '2024-01-01',
                    created_at_maximum: '2024-12-31'
                },
                params: { report: 'report-orders' },
                dbConnection: mockDbConnection,
                context: {
                    settings: { report_row_limit_display: 10 }
                },
                entitySchemaCollection: mockEntitySchema
            };

            await reportService.getReport(data);

            expect(mockDbConnection.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT'),
                expect.arrayContaining(['Paid', '2024-01-01', '2024-12-31'])
            );
        });

        it('should throw error for invalid report type', async () => {
            const data = {
                body: {},
                params: { report: 'invalid-report' },
                dbConnection: mockDbConnection,
                entitySchemaCollection: mockEntitySchema
            };

            await expect(reportService.getReport(data)).rejects.toThrow();
        });
    });

    describe('exportReport', () => {
        it('should call exportService with correct data', async () => {
            const data = {
                body: {},
                params: { 
                    report: 'report-orders',
                    format: 'csv'
                },
                dbConnection: mockDbConnection,
                res: {}
            };

            await reportService.exportReport(data);

            expect(mockExportService.exportReport).toHaveBeenCalled();
            expect(mockExportService.exportReport).toHaveBeenCalledWith(
                expect.objectContaining({
                    format: 'csv',
                    filename: 'report',
                    query: expect.any(String),
                    values: expect.any(Array)
                })
            );
        });
    });
});