const { validateQueryParams } = require("../../serverConfigurations/validation");
const ExportController = require("../exportController");

jest.mock("../../serverConfigurations/validation");

describe("ExportController", () => {
    let exportController;
    let exportService;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        // Mock the service layer
        exportService = {
            exportToCsv: jest.fn(),
            exportToExcel: jest.fn(),
        };

        // Initialize the controller with the mocked service
        exportController = new ExportController(exportService);

        // Mock response and next functions
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };
        mockNext = jest.fn();

        // Reset mocks before each test
        validateQueryParams.mockReset();
    });

    describe("exportToCsv", () => {
        it("should call exportService.exportToCsv and validate query params", async () => {
            const req = {
                query: { filter: "test" },
                params: { entity: "testEntity" },
                entitySchemaCollection: {
                    testEntity: { queryValidationSchema: "testSchema" },
                    testSchema: {},
                },
                dbConnection: {},
            };

            await exportController.exportToCsv(req, mockRes, mockNext);

            expect(validateQueryParams).toHaveBeenCalledWith(req, {});
            expect(exportService.exportToCsv).toHaveBeenCalledWith({
                res: mockRes,
                query: req.query,
                params: req.params,
                entitySchemaCollection: req.entitySchemaCollection,
                dbConnection: req.dbConnection,
            });
        });
    });

    describe("exportToExcel", () => {
        it("should call exportService.exportToExcel and validate query params", async () => {
            const req = {
                query: { filter: "test" },
                params: { entity: "testEntity" },
                entitySchemaCollection: {
                    testEntity: { queryValidationSchema: "testSchema" },
                    testSchema: {},
                },
                dbConnection: {},
            };

            await exportController.exportToExcel(req, mockRes, mockNext);

            expect(validateQueryParams).toHaveBeenCalledWith(req, {});
            expect(exportService.exportToExcel).toHaveBeenCalledWith({
                res: mockRes,
                query: req.query,
                params: req.params,
                entitySchemaCollection: req.entitySchemaCollection,
                dbConnection: req.dbConnection,
            });
        });
    });
});