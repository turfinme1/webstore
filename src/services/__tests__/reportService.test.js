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
      query: jest.fn().mockResolvedValue({ rows: [] }),
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
        session: { admin_user_id: 1 },
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
        session: { admin_user_id: 1 },
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
        session: { admin_user_id: 1 },
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
        session: { admin_user_id: 1 },
      };

      await expect(reportService.getReport(data)).rejects.toThrow();
    });

    describe("dashboard reports", () => {
      const mockContext = {
          settings: { report_row_limit_display: "100" }
      };

      it("should return dashboard report data when requesting valid dashboard report", async () => {
          const data = {
              body: {},
              params: { report: "store-trends" },
              dbConnection: mockDbConnection,
              entitySchemaCollection: mockEntitySchema,
              context: mockContext,
              session: { admin_user_id: 1 },
          };

          const mockRows = [{ metric1: 'value1' }];
          mockDbConnection.query.mockResolvedValue({ rows: mockRows });

          const result = await reportService.getReport(data);

          expect(result).toEqual({ rows: mockRows });
          expect(mockDbConnection.query).toHaveBeenCalled();
      });

      it("should throw error when requesting invalid dashboard report", async () => {
          const data = {
              body: {},
              params: { report: "invalid-dashboard-report" },
              dbConnection: mockDbConnection,
              entitySchemaCollection: mockEntitySchema,
              context: mockContext,
              session: { admin_user_id: 1 },
          };

          await expect(reportService.getReport(data)).rejects.toThrow("Report invalid-dashboard-report not found");
      });

      it("should process dashboard report without requiring metadata validation", async () => {
          const data = {
              body: { metadataRequest: true },
              params: { report: "store-trends" },
              dbConnection: mockDbConnection,
              entitySchemaCollection: mockEntitySchema,
              context: mockContext,
              session: { admin_user_id: 1 },
          };

          const mockRows = [{ metric1: 'value1' }];
          mockDbConnection.query.mockResolvedValue({ rows: mockRows });

          const result = await reportService.getReport(data);

          expect(result).toEqual({ rows: mockRows });
          expect(mockDbConnection.query).toHaveBeenCalled();
      });
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
        session: { admin_user_id: 1 },
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
      
      // Mock the preference methods
      reportService.replacePreferenceExpressions = jest.fn().mockImplementation((data, sql) => Promise.resolve(sql));
      reportService.getReportPreference = jest.fn().mockResolvedValue({ rows: [] });
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
          session: { admin_user_id: 1 },
        };

        const result = await reportService.ordersByUserReportDefinition(data);

        expect(result).toHaveProperty("reportUIConfig");
        expect(result).toHaveProperty("sql");
        expect(result).toHaveProperty("reportFilters");

        expect(result.reportUIConfig.title).toBe("Orders Report by User");
      });

      it("should have correct SQL query structure", async () => {
        const data = { body: {}, session: { admin_user_id: 1 } };
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
          session: { admin_user_id: 1 },
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
          session: { admin_user_id: 1 },
        };

        const result = await reportService.ordersReportDefinition(data);

        expect(result.reportUIConfig.title).toBe("Orders Report");
        expect(result.reportUIConfig.exportConfig).toBeDefined();
        expect(result.reportUIConfig.exportConfig.csv).toBeDefined();
        expect(result.reportUIConfig.exportConfig.excel).toBeDefined();
      });

      it("should have correct SQL calculations", async () => {
        const data = { body: {}, session: { admin_user_id: 1 } };
        const result = await reportService.ordersReportDefinition(data);

        // These assertions may need to be adjusted based on your SQL changes
        expect(result.sql).toContain('SUM(TRUNC(O.total_price * O.discount_percentage');
        expect(result.sql).toContain('SUM(TRUNC((O.total_price - TRUNC(O.total_price * O.discount_percentage');
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
    const mockReportFilters = [
      {
          key: 'created_at',
          grouping_expression: 'N.created_at',
          filter_expression: 'N.created_at = $FILTER_VALUE$',
      },
      {
          key: 'name',
          grouping_expression: 'N.name',
          filter_expression: 'N.name = $FILTER_VALUE$',
      }
    ];
    
    // Mock data object for consistent test environment
    const testData = {
      session: { admin_user_id: 1 },
      dbConnection: { query: jest.fn().mockResolvedValue({ rows: [] }) }
    };
    
    // Mock reportUIConfig object
    const testReportUIConfig = {
      headerGroups: [
        [
          { key: 'created_at', label: 'Created At' },
          { key: 'name', label: 'Name' }
        ]
      ]
    };
  
    beforeEach(() => {
      reportService = new ReportService({});
      reportService.replacePreferenceExpressions = jest.fn().mockImplementation(
        (data, sql) => Promise.resolve(sql)
      );
    });
  
    it('should handle timestamp grouping with valid value', async () => {
      const sql = 'SELECT $date_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'date',
        type: 'timestamp',
        grouping_expression: 'table.date'
      }];
      const inputData = {
        date_grouping_select_value: 'month'
      };
  
      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        reportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe("SELECT DATE_TRUNC('month', table.date) FROM table");
      expect(reportService.replacePreferenceExpressions).toHaveBeenCalled();
    });
  
    it('should throw error for invalid timestamp grouping value', async () => {
      const sql = 'SELECT $date_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'date',
        type: 'timestamp',
        grouping_expression: 'table.date'
      }];
      const inputData = {
        date_grouping_select_value: 'invalid'
      };
  
      await expect(
        reportService.replaceFilterExpressions(
          testData, 
          sql, 
          reportFilters, 
          testReportUIConfig, 
          inputData, 
          false
        )
      ).rejects.toThrow('Invalid grouping value invalid');
    });
  
    it('should use grouping expression for non-timestamp types', async () => {
      const sql = 'SELECT $status_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'status',
        type: 'select',
        grouping_expression: 'table.status'
      }];
      const inputData = {
        status_grouping_select_value: 'some_value'
      };
  
      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        reportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT table.status FROM table');
    });
  
    it('should use grouping expression when no groupings are selected', async () => {
      const sql = 'SELECT $status_grouping_expression$ FROM table';
      const reportFilters = [{
        key: 'status',
        type: 'select',
        grouping_expression: 'table.status'
      }];
      const inputData = {};  // No grouping values
  
      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        reportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT table.status FROM table');
    });
  
    it('should use "All" when some groupings are selected but not this one', async () => {
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
      const inputData = {
        date_grouping_select_value: 'month'  // Only date has grouping
      };
  
      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        reportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe("SELECT 'All', DATE_TRUNC('month', table.date) FROM table");
    });

    it('should replace ORDER BY clause with valid sort criteria', async () => {
      const sql = 'SELECT * FROM table ORDER BY 1 DESC';
      const inputData = {
        sortCriteria: [
          { key: 'created_at', direction: 'ASC' },
          { key: 'name', direction: 'DESC' }
        ]
      };

      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        mockReportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT * FROM table ORDER BY  created_at ASC , name DESC  ');
    });

    it('should ignore invalid sort directions', async () => {
      const sql = 'SELECT * FROM table ORDER BY 1 DESC';
      const inputData = {
        sortCriteria: [
          { key: 'created_at', direction: 'INVALID' },
          { key: 'name', direction: 'DESC' }
        ]
      };

      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        mockReportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT * FROM table ORDER BY  name DESC  ');
    });

    it('should ignore non-existent filter keys', async () => {
      const sql = 'SELECT * FROM table ORDER BY 1 DESC';
      const inputData = {
        sortCriteria: [
          { key: 'non_existent', direction: 'ASC' },
          { key: 'name', direction: 'DESC' }
        ]
      };

      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        mockReportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT * FROM table ORDER BY  name DESC  ');
    });

    it('should keep original ORDER BY when no valid sort criteria', async () => {
      const sql = 'SELECT * FROM table ORDER BY 1 DESC';
      const inputData = {
        sortCriteria: [
          { key: 'non_existent', direction: 'INVALID' }
        ]
      };

      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        mockReportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT * FROM table ORDER BY 1 DESC');
    });

    it('should handle empty sort criteria array', async () => {
      const sql = 'SELECT * FROM table ORDER BY 1 DESC';
      const inputData = {
        sortCriteria: []
      };

      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        mockReportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT * FROM table ORDER BY 1 DESC');
    });

    it('should handle missing sortCriteria', async () => {
      const sql = 'SELECT * FROM table ORDER BY 1 DESC';
      const inputData = {};

      const result = await reportService.replaceFilterExpressions(
        testData, 
        sql, 
        mockReportFilters, 
        testReportUIConfig, 
        inputData, 
        false
      );
      
      expect(result.sql).toBe('SELECT * FROM table ORDER BY 1 DESC');
    });
  });
  
  describe('Report Preferences', () => {
    let reportService;
    let mockDbConnection;
    
    beforeEach(() => {
      mockDbConnection = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
      reportService = new ReportService({});
    });

    describe('setReportPreference', () => {
      it('should call query with correct parameters', async () => {
        const mockPreference = { 
          headerGroups: [
            { key: 'column1', hideInUI: true },
            { key: 'column2', hideInUI: false }
          ] 
        };
        
        const mockData = {
          dbConnection: mockDbConnection,
          session: { admin_user_id: 42 },
          params: { report: 'report-orders' },
          body: mockPreference
        };

        await reportService.setReportPreference(mockData);

        expect(mockDbConnection.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO user_report_preferences'),
          [42, 'report-orders', JSON.stringify(mockPreference)]
        );
        
        const sqlQuery = mockDbConnection.query.mock.calls[0][0];
        expect(sqlQuery).toContain('ON CONFLICT (admin_user_id, report_name)');
        expect(sqlQuery).toContain('DO UPDATE SET preference = $3');
      });

      it('should throw error when required data is missing', async () => {
        const invalidData = {
          dbConnection: mockDbConnection,
          params: { report: 'report-orders' },
          body: {}
        };

        await expect(reportService.setReportPreference(invalidData))
          .rejects.toThrow();
      });
    });

    describe('getReportPreference', () => {
      it('should call query with correct parameters', async () => {
        // Arrange
        const mockData = {
          dbConnection: mockDbConnection,
          session: { admin_user_id: 42 },
          params: { report: 'report-orders' }
        };

        const mockQueryResult = { 
          rows: [{ 
            admin_user_id: 42,
            report_name: 'report-orders',
            preference: { headerGroups: [{ key: 'column1', hideInUI: true }] }
          }] 
        };
        
        mockDbConnection.query.mockResolvedValue(mockQueryResult);

        // Act
        const result = await reportService.getReportPreference(mockData);

        // Assert
        expect(mockDbConnection.query).toHaveBeenCalledWith(
          expect.stringContaining('SELECT * FROM user_report_preferences'),
          [42, 'report-orders']
        );
        expect(result).toEqual(mockQueryResult);
      });

      it('should return empty result when no preferences exist', async () => {
        // Arrange
        const mockData = {
          dbConnection: mockDbConnection,
          session: { admin_user_id: 99 },
          params: { report: 'report-nonexistent' }
        };

        const emptyResult = { rows: [] };
        mockDbConnection.query.mockResolvedValue(emptyResult);

        // Act
        const result = await reportService.getReportPreference(mockData);

        // Assert
        expect(result).toEqual(emptyResult);
        expect(mockDbConnection.query).toHaveBeenCalledWith(
          expect.any(String),
          [99, 'report-nonexistent']
        );
      });

      it('should throw error when required data is missing', async () => {
        // Arrange
        const invalidData = {
          dbConnection: mockDbConnection,
          // Missing session
          params: { report: 'report-orders' }
        };

        // Act & Assert
        await expect(reportService.getReportPreference(invalidData))
          .rejects.toThrow();
      });

      it('should handle database errors properly', async () => {
        // Arrange
        const mockData = {
          dbConnection: mockDbConnection,
          session: { admin_user_id: 42 },
          params: { report: 'report-orders' }
        };
        
        const dbError = new Error('Database connection failed');
        mockDbConnection.query.mockRejectedValue(dbError);

        // Act & Assert
        await expect(reportService.getReportPreference(mockData))
          .rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('replacePreferenceExpressions', () => {
    beforeEach(() => {
      reportService = new ReportService({});
      mockDbConnection = {
        query: jest.fn(),
      };
      reportService.getReportPreference = jest.fn().mockImplementation(
        (data) => Promise.resolve({ rows: [{ preference: { headerGroups: [
          
        ] } }] })
      );
    });
    
    it('should handle empty preferences correctly', async () => {
      const sql = 'SELECT $column_display_preference$ column FROM table';
      const data = {
        session: { admin_user_id: 1 },
        dbConnection: mockDbConnection
      };
      const reportUIConfig = {
        headerGroups: [[{ key: 'column', label: 'Column', isAggregate: false }]]
      };
      
      const result = await reportService.replacePreferenceExpressions(data, sql, reportUIConfig, true);
      expect(result).toBe('SELECT  column FROM table');
    });
    
    it('should apply column preferences correctly', async () => {
      const sql = 'SELECT $column_display_preference$ column FROM table';
      const data = {
        session: { admin_user_id: 1 },
        dbConnection: mockDbConnection
      };
      const reportUIConfig = {
        headerGroups: [[{ key: 'column', label: 'Column', isAggregate: false }]]
      };

      reportService.getReportPreference = jest.fn().mockResolvedValue({
        rows: [{ preference: { headerGroups: [{ key: 'column', hideInUI: true }] } }]
      });
      
      const result = await reportService.replacePreferenceExpressions(data, sql, reportUIConfig, true);
      expect(result).toBe('SELECT --  column FROM table');
    });
    
    it('should generate group by expression correctly', async () => {
      const sql = 'SELECT * FROM table $group_by_expression$';
      const data = {
        session: { admin_user_id: 1 },
        dbConnection: mockDbConnection
      };
      const reportUIConfig = {
        headerGroups: [[
          { key: 'column1', label: 'Column 1', isAggregate: false },
          { key: 'column2', label: 'Column 2', isAggregate: true }
        ]]
      };
      
      mockDbConnection.query.mockResolvedValue({ rows: [] });
      
      const result = await reportService.replacePreferenceExpressions(data, sql, reportUIConfig, false);
      expect(result).toBe('SELECT * FROM table GROUP BY 1');
    });
    
    it('should not apply preferences when shouldApplyUserPreference is false', async () => {
      const sql = 'SELECT $column_display_preference$ * FROM table';
      const data = {
        session: { admin_user_id: 1 },
        dbConnection: mockDbConnection
      };
      const reportUIConfig = {
        headerGroups: [[{ key: 'column', label: 'Column' }]]
      };
      
      const result = await reportService.replacePreferenceExpressions(data, sql, reportUIConfig, false);
      expect(result).toBe('SELECT  * FROM table');
      expect(mockDbConnection.query).not.toHaveBeenCalled();
    });
  });
});