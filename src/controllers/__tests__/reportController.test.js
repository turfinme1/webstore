const ReportController = require("../reportController");

describe('ReportController', () => {
  let reportController;
  let mockReportService;
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    mockReportService = {
      getReport: jest.fn(),
      exportReport: jest.fn(),
      getAllReports: jest.fn(),
      setReportPreference: jest.fn(),
      getReportPreference: jest.fn()
    };
    
    reportController = new ReportController(mockReportService);
    
    mockRequest = {
      body: { headerGroups: [{ key: 'column1', hideInUI: true }] },
      params: { report: 'test-report' },
      session: { admin_user_id: 123 },
      context: { settings: {} },
      dbConnection: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
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
      mockReportService.getReport.mockResolvedValue(result);

      await reportController.getReport(req, mockResponse, mockNext);

      expect(mockReportService.getReport).toHaveBeenCalledWith({
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection,
        entitySchemaCollection: req.entitySchemaCollection
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(result);
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
      mockReportService.exportReport.mockResolvedValue(result);

      await reportController.exportReport(req, mockResponse, mockNext);

      expect(mockReportService.exportReport).toHaveBeenCalledWith({
        res: mockResponse,
        body: req.body,
        params: req.params,
        session: req.session,
        dbConnection: req.dbConnection
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(result);
    });
  });

  describe('setReportPreference', () => {
    it('should call reportService.setReportPreference with correct data', async () => {
      // Arrange
      const expectedResult = { success: true };
      mockReportService.setReportPreference.mockResolvedValue(expectedResult);
      
      // Act
      await reportController.setReportPreference(mockRequest, mockResponse);
      
      // Assert
      expect(mockReportService.setReportPreference).toHaveBeenCalledWith({
        body: mockRequest.body,
        params: mockRequest.params,
        session: mockRequest.session,
        context: mockRequest.context,
        dbConnection: mockRequest.dbConnection
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('getReportPreference', () => {
    it('should call reportService.getReportPreference with correct data', async () => {
      // Arrange
      const expectedResult = {
        rows: [
          {
            preference: {
              headerGroups: [
                { key: 'column1', hideInUI: true }
              ]
            }
          }
        ]
      };
      mockReportService.getReportPreference.mockResolvedValue(expectedResult);
      
      // Act
      await reportController.getReportPreference(mockRequest, mockResponse);
      
      // Assert
      expect(mockReportService.getReportPreference).toHaveBeenCalledWith({
        body: mockRequest.body,
        params: mockRequest.params,
        session: mockRequest.session,
        context: mockRequest.context,
        dbConnection: mockRequest.dbConnection
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedResult);
    });

    it('should handle case when no preferences exist', async () => {
      // Arrange
      const emptyResult = { rows: [] };
      mockReportService.getReportPreference.mockResolvedValue(emptyResult);
      
      // Act
      await reportController.getReportPreference(mockRequest, mockResponse);
      
      // Assert
      expect(mockReportService.getReportPreference).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(emptyResult);
    });
  });

  describe('getAllReports', () => {
    it('should call reportService.getAllReports and respond with status 200', async () => {
      const expectedReports = [
        {  name: 'orders-report', title: 'Orders Report' },
        {  name: 'users-report', title: 'Users Report' },
      ];
      
      mockReportService.getAllReports.mockResolvedValue(expectedReports);
      
      await reportController.getAllReports(mockRequest, mockResponse, mockNext);
      
      expect(mockReportService.getAllReports).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedReports);
    });

    it('should handle empty reports list', async () => {
      mockReportService.getAllReports.mockResolvedValue([]);
      
      await reportController.getAllReports(mockRequest, mockResponse, mockNext);
      
      expect(mockReportService.getAllReports).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith([]);
    });
  });
});