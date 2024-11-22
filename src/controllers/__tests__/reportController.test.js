const ReportController = require("../reportController");

describe("ReportController", () => {
  let reportController;
  let reportService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    reportService = {
      getOrdersByUserReport: jest.fn(),
    };

    reportController = new ReportController(reportService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe("getOrdersByUserReport", () => {
    it("should call reportService.getOrdersByUserReport and respond with status 200", async () => {
      const req = {
        body: { userId: 1 },
        params: { id: 1 },
        session: { user_id: 1 },
        dbConnection: {},
      };

      const result = { orders: [] };
      reportService.getOrdersByUserReport.mockResolvedValue(result);

      await reportController.getOrdersByUserReport(req, mockRes, mockNext);

      expect(reportService.getOrdersByUserReport).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(result);
    });
  });
});