const ReportService = require("../reportService");

describe("ReportService", () => {
  let reportService;
  let mockDbConnection;
  let mockExportService;

  beforeEach(() => {
    mockExportService = {
      exportReport: jest.fn(),
    };
    reportService = new ReportService(mockExportService);
    mockDbConnection = {
      query: jest.fn(),
    };
  });

  describe("getReport", () => {
    const mockEntitySchema = {
      reportUI: {
        type: "object",
        properties: {
          title: { type: "string" },
          dataEndpoint: { type: "string" },
          filters: { type: "array" },
          tableTemplate: { type: "string" },
          headerGroups: { type: "array" },
          columns: { type: "array" },
        },
      },
    };

    it("should return metadata for report when metadataRequest is true", async () => {
      const data = {
        body: { metadataRequest: true },
        params: { report: "report-orders" },
        dbConnection: mockDbConnection,
        entitySchemaCollection: mockEntitySchema,
      };

      const result = await reportService.getReport(data);

      expect(result).toHaveProperty("reportUIConfig");
      expect(result).toHaveProperty("sql");
      expect(result).toHaveProperty("reportFilters");
    });

    it("should execute query and return results when metadataRequest is false", async () => {
      const mockRows = [{ id: 1 }];
      mockDbConnection.query.mockResolvedValue({ rows: mockRows });

      const data = {
        body: {},
        params: { report: "report-orders" },
        dbConnection: mockDbConnection,
        context: {
          settings: { report_row_limit_display: 10 },
        },
        entitySchemaCollection: mockEntitySchema,
      };

      const result = await reportService.getReport(data);

      expect(result).toHaveProperty("rows", mockRows);
      expect(result).toHaveProperty("overRowDisplayLimit");
      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.any(Array)
      );
    });

    it("should handle filters correctly", async () => {
      mockDbConnection.query.mockResolvedValue({ rows: [] });

      const data = {
        body: {
          status_filter_value: "Paid",
          created_at_minimum_filter_value: "2024-01-01",
          created_at_maximum_filter_value: "2024-12-31",
        },
        params: { report: "report-orders" },
        dbConnection: mockDbConnection,
        context: {
          settings: { report_row_limit_display: 10 },
        },
        entitySchemaCollection: mockEntitySchema,
      };

      await reportService.getReport(data);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        expect.arrayContaining(["Paid", "2024-01-01", "2024-12-31"])
      );
    });

    it("should throw error for invalid report type", async () => {
      const data = {
        body: {},
        params: { report: "invalid-report" },
        dbConnection: mockDbConnection,
        entitySchemaCollection: mockEntitySchema,
      };

      await expect(reportService.getReport(data)).rejects.toThrow();
    });
  });

  describe("exportReport", () => {
    it("should call exportService with correct data", async () => {
      const data = {
        body: {},
        params: {
          report: "report-orders",
          format: "csv",
        },
        dbConnection: mockDbConnection,
        res: {},
      };

      await reportService.exportReport(data);

      expect(mockExportService.exportReport).toHaveBeenCalled();
      expect(mockExportService.exportReport).toHaveBeenCalledWith(
        expect.objectContaining({
          format: "csv",
          filename: "report",
          query: expect.any(String),
          values: expect.any(Array),
        })
      );
    });
  });

  describe("ReportService Report Definitions", () => {
    let reportService;
    let mockExportService;
    let mockDbConnection;

    beforeEach(() => {
      mockExportService = {
        exportReport: jest.fn(),
      };
      mockDbConnection = {
        query: jest.fn(),
      };
      reportService = new ReportService(mockExportService);
    });

    describe("ordersByUserReportDefinition", () => {
      it("should return correct report structure", async () => {
        const data = {
          body: {
            user_email: "test@example.com",
            user_id: "1",
            order_total_minimum: "100",
            order_total_maximum: "200",
          },
        };

        const result = await reportService.ordersByUserReportDefinition(data);

        expect(result).toHaveProperty("reportUIConfig");
        expect(result).toHaveProperty("sql");
        expect(result).toHaveProperty("reportFilters");

        expect(result.reportUIConfig.title).toBe("Orders Report by User");
        
      });

      it("should have correct SQL query structure", async () => {
        const data = { body: {} };
        const result = await reportService.ordersByUserReportDefinition(data);

        expect(result.sql).toContain("SELECT");
        expect(result.sql).toContain("FROM orders O");
        expect(result.sql).toContain("JOIN users U ON U.id = O.user_id");
        expect(result.sql).toContain("GROUP BY");
      });
    });

    describe("logsReportDefinition", () => {
      it("should return correct report structure", async () => {
        const data = {
          body: {
            created_at_minimum: "2024-01-01",
            created_at_maximum: "2024-12-31",
            status_code: "400",
            log_level: "ERROR",
            created_at_grouping_select_value: "day",
          },
        };

        const result = await reportService.logsReportDefinition(data);

        expect(result.reportUIConfig.title).toBe("Logs Report");
        
      });

      
    });

    describe("ordersReportDefinition", () => {
      it("should return correct report structure", async () => {
        const data = {
          body: {
            created_at_minimum: "2024-01-01",
            status: "Paid",
            total_price_minimum: "100",
            created_at_grouping_select_value: "month",
          },
        };

        const result = await reportService.ordersReportDefinition(data);

        expect(result.reportUIConfig.title).toBe("Orders Report");
        expect(result.reportUIConfig.exportConfig).toBeDefined();
        expect(result.reportUIConfig.exportConfig.csv).toBeDefined();
        expect(result.reportUIConfig.exportConfig.excel).toBeDefined();

       
      });

      it("should have correct SQL calculations", async () => {
        const data = { body: {} };
        const result = await reportService.ordersReportDefinition(data);

        expect(result.sql).toContain(
          'SUM(ROUND(O.total_price * O.discount_percentage / 100, 2)) AS "discount_amount"'
        );
        expect(result.sql).toContain(
          'SUM(ROUND(O.total_price * (1 - O.discount_percentage / 100) * O.vat_percentage / 100, 2))  AS "vat_amount"'
        );
      });
    });

    describe("formatReportMetadata", () => {
      it("should format date range filters correctly", () => {
        const reportFilters = [
          {
            key: "created_at_minimum",
            type: "timestamp",
          },
        ];

        const INPUT_DATA = {
          created_at_minimum_filter_value: "2024-01-01",
          created_at_maximum_filter_value: "2024-12-31",
        };

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );

        expect(result.filters["Created At"]).toBe("2024-01-01 to 2024-12-31");
      });

      it("should format single date filters correctly", () => {
        const reportFilters = [
          {
            key: "created_at_minimum",
            type: "timestamp",
          },
        ];

        const INPUT_DATA = {
          created_at_minimum_filter_value: "2024-01-01",
        };

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );

        expect(result.filters["Created At"]).toBe("From 2024-01-01");
      });

      it("should format groupings correctly", () => {
        const reportFilters = [
          {
            key: "status",
            type: "select",
          },
        ];

        const INPUT_DATA = {
          status_grouping_select_value: "month",
        };

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );

        expect(result.groupings["Status"]).toBe("Month");
      });

      it("should handle empty filters and groupings", () => {
        const reportFilters = [
          {
            key: "status",
            type: "select",
          },
        ];

        const INPUT_DATA = {};

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );

        expect(result.filters).toEqual({});
        expect(result.groupings).toEqual({});
      });

      it("should format date with only max value", () => {
        const reportFilters = [
          {
            key: "created_at_minimum", // Using minimum key to trigger date range formatting
            type: "timestamp",
          },
        ];

        // Only provide maximum date value
        const INPUT_DATA = {
          created_at_maximum_filter_value: "2024-12-31",
          // No minimum value provided
        };

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );
        expect(result.filters["Created At"]).toBe("To 2024-12-31");
      });

      it("should return null when no date values provided", () => {
        const reportFilters = [
          {
            key: "created_at_minimum",
            type: "timestamp",
          },
        ];

        const INPUT_DATA = {};

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );
        expect(result.filters["Created At"]).toBeUndefined();
      });

      it("should format regular filter value", () => {
        const reportFilters = [
          {
            key: "status",
            type: "select",
          },
        ];

        const INPUT_DATA = {
          status_filter_value: "Pending",
        };

        const result = reportService.formatReportMetadata(
          reportFilters,
          INPUT_DATA
        );
        expect(result.filters["Status"]).toBe("Pending");
      });
    });
  });

  describe('replaceFilterExpressions', () => {
    let reportService;
  
    beforeEach(() => {
      reportService = new ReportService({});
    });
  
    it('should handle timestamp grouping with valid value', () => {
      const sql = 'SELECT $date_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'date',
        type: 'timestamp',
        grouping_expression: 'table.date'
      }];
      const INPUT_DATA = {
        date_grouping_select_value: 'month'
      };
  
      const result = reportService.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
      expect(result.sql).toBe("SELECT DATE_TRUNC('month', table.date) FROM table");
    });
  
    it('should throw error for invalid timestamp grouping value', () => {
      const sql = 'SELECT $date_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'date',
        type: 'timestamp',
        grouping_expression: 'table.date'
      }];
      const INPUT_DATA = {
        date_grouping_select_value: 'invalid'
      };
  
      expect(() => {
        reportService.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
      }).toThrow('Invalid grouping value invalid');
    });
  
    it('should use grouping expression for non-timestamp types', () => {
      const sql = 'SELECT $status_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'status',
        type: 'select',
        grouping_expression: 'table.status'
      }];
      const INPUT_DATA = {
        status_grouping_select_value: 'some_value'
      };
  
      const result = reportService.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
      expect(result.sql).toBe('SELECT table.status FROM table');
    });
  
    it('should use grouping expression when no groupings are selected', () => {
      const sql = 'SELECT $status_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'status',
        type: 'select',
        grouping_expression: 'table.status'
      }];
      const INPUT_DATA = {};  // No grouping values
  
      const result = reportService.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
      expect(result.sql).toBe('SELECT table.status FROM table');
    });
  
    it('should use "All" when some groupings are selected but not this one', () => {
      const sql = 'SELECT $status_grouping_expression$, $date_grouping_expression$ FROM table';
      const reportFilters = [
        {
          key: 'status',
          type: 'select',
          grouping_expression: 'table.status'
        },
        {
          key: 'date',
          type: 'timestamp',
          grouping_expression: 'table.date'
        }
      ];
      const INPUT_DATA = {
        date_grouping_select_value: 'month'  // Only date has grouping
      };
  
      const result = reportService.replaceFilterExpressions(sql, reportFilters, INPUT_DATA);
      expect(result.sql).toBe("SELECT 'All', DATE_TRUNC('month', table.date) FROM table");
    });
  });
});
