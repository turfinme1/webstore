const ReportController = require("../reportController");

describe("ReportController", () => {
  let reportController;
  let reportService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    reportService = {
      getReport: jest.fn(),
      exportReport: jest.fn()
    };

    reportController = new ReportController(reportService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe("getReport", () => {
    it("should call reportService.getReport and respond with status 200", async () => {
      const req = {
        body: { userId: 1 },
        params: { report: 'report-orders' },
        session: { user_id: 1 },
        dbConnection: {},
        entitySchemaCollection: {
          reportUI: {
            type: 'object',
            properties: {}
          }
        }
      };

      const result = { rows: [], filters: [], overRowDisplayLimit: false };
      reportService.getReport.mockResolvedValue(result);

      await reportController.getReport(req, mockRes, mockNext);

      expect(reportService.getReport).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });
  });

  describe("exportReport", () => {
    it("should call reportService.exportReport and respond with status 200", async () => {
      const req = {
        body: { userId: 1 },
        params: { report: 'report-orders', format: 'csv' },
        session: { user_id: 1 },
        dbConnection: {}
      };

      const result = {};
      reportService.exportReport.mockResolvedValue(result);

      await reportController.exportReport(req, mockRes, mockNext);

      expect(reportService.exportReport).toHaveBeenCalledWith({
        res: mockRes,
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });
  });
});