const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const ExcelJS = require("exceljs");
const ExportService = require("../exportService");
const { executionAsyncId } = require("async_hooks");

jest.mock("stream/promises");
jest.mock("exceljs");

describe("ExportService", () => {
  let exportService;
  let crudServiceMock;
  let dbConnectionMock;
  let resMock;

  beforeEach(() => {
    crudServiceMock = {
      buildFilteredPaginatedQuery: jest.fn(),
    };
    dbConnectionMock = {
      query: jest.fn(),
    };
    resMock = {
      writeHead: jest.fn(),
      end: jest.fn(),
    };
    exportService = new ExportService(crudServiceMock);
  });

  describe("exportToExcel", () => {
    it("should export data to Excel", async () => {
      // mock ExcelJS.stream.xlsx.WorkbookWriter returning workbook with function addRow
      jest.spyOn(ExcelJS.stream.xlsx, "WorkbookWriter").mockReturnValue({
        addWorksheet: jest.fn().mockReturnValue({
          addRow: jest.fn().mockReturnValue({
            commit: jest.fn(),
          }),
          commit: jest.fn(),
        }),
        commit: jest.fn(),
      });

      exportService.executeQueryWithCursor = jest.fn().mockResolvedValueOnce(
        (async function* fetchRows() {
          yield [{ id: 1 }];
        })()
      );

      const data = {
        params: { entity: "testEntity" },
        res: resMock,
        dbConnection: dbConnectionMock,
      };
      const parameters = {
        query: "SELECT * FROM test",
        aggregatedTotalQuery: "SELECT SUM(total_price) FROM test",
        searchValues: [],
        appliedFilters: { filter1: "value1" },
        appliedGroups: { group1: "value1" },
      };
      crudServiceMock.buildFilteredPaginatedQuery.mockReturnValue(parameters);
      dbConnectionMock.query.mockResolvedValueOnce({
        rows: [{ total_price: "100" }],
      });
      dbConnectionMock.query.mockResolvedValueOnce({
        rows: [{ total_total_price: "100" }],
      });

      await exportService.exportToExcel(data);

      expect(resMock.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=testEntity.xlsx",
      });
      expect(crudServiceMock.buildFilteredPaginatedQuery).toHaveBeenCalledWith(
        data,
        true
      );
      expect(dbConnectionMock.query).toHaveBeenCalledWith(
        "SELECT SUM(total_price) FROM test",
        []
      );
    });
  });

  describe("exportToCsv", () => {
    it("should export data to CSV", async () => {
      const data = {
        params: { entity: "testEntity" },
        res: resMock,
        dbConnection: dbConnectionMock,
      };
      const parameters = {
        query: "SELECT * FROM test",
        aggregatedTotalQuery: "SELECT SUM(total_price) FROM test",
        searchValues: [],
        appliedFilters: { filter1: "value1" },
        appliedGroups: { group1: "value1" },
      };
      exportService.executeQueryWithCursor = jest.fn().mockResolvedValueOnce(
        (async function* fetchRows() {
          yield [{ id: 1 }];
        })()
      );

      crudServiceMock.buildFilteredPaginatedQuery.mockReturnValue(parameters);
      dbConnectionMock.query.mockResolvedValueOnce({
        rows: [{ total_price: "100" }],
      });
      dbConnectionMock.query.mockResolvedValueOnce({
        rows: [{ total_total_price: "100" }],
      });

      await exportService.exportToCsv(data);

      expect(resMock.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=testEntity.csv",
      });
      expect(crudServiceMock.buildFilteredPaginatedQuery).toHaveBeenCalledWith(
        data,
        true
      );
    });
  });

  describe("executeQueryWithCursor", () => {
    it("should execute query with cursor", async () => {
      const data = {
        query: "SELECT * FROM test",
        searchValues: [],
        dbConnection: dbConnectionMock,
      };
      dbConnectionMock.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      dbConnectionMock.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      dbConnectionMock.query.mockResolvedValueOnce({ rows: [] });

      const rowGenerator = await exportService.executeQueryWithCursor(data);
      const rows = [];
      for await (const row of rowGenerator) {
        rows.push(row);
      }

      expect(dbConnectionMock.query).toHaveBeenCalledWith(
        "DECLARE export_cursor CURSOR FOR SELECT * FROM test",
        []
      );
      expect(dbConnectionMock.query).toHaveBeenCalledWith(
        "FETCH 10000 FROM export_cursor"
      );
      expect(dbConnectionMock.query).toHaveBeenCalledWith(
        "CLOSE export_cursor"
      );
      expect(rows).toEqual([[{ id: 1 }]]);
    });
  });

  describe("fetchRowsWithCursor", () => {
    it("should fetch rows using cursor", async () => {
      const data = {
        query: "SELECT * FROM test",
        values: [1, 2],
        dbConnection: dbConnectionMock,
      };

      // Mock sequence of query responses
      dbConnectionMock.query
        .mockResolvedValueOnce({ rows: [] }) // Declare cursor
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // First fetch
        .mockResolvedValueOnce({ rows: [] }) // No more rows
        .mockResolvedValueOnce({ rows: [] }); // Close cursor

      const rowGenerator = await exportService.fetchRowsWithCursor(data);
      const rows = [];
      for await (const row of rowGenerator) {
        rows.push(row);
      }

      expect(dbConnectionMock.query).toHaveBeenCalledWith(
        "DECLARE export_cursor CURSOR FOR SELECT * FROM test",
        [1, 2]
      );
      expect(rows).toEqual([[{ id: 1 }]]);
      expect(dbConnectionMock.query).toHaveBeenCalledWith(
        "CLOSE export_cursor"
      );
    });
  });

  describe("exportReport", () => {
    it("should validate required parameters", async () => {
      const data = {
        format: "csv",
        // Missing other required fields
      };

      await expect(exportService.exportReport(data)).rejects.toThrow(
        "Missing query"
      );
    });

    it("should throw error for invalid format", async () => {
      const data = {
        format: "invalid",
        query: "SELECT *",
        values: [],
        filename: "test",
      };

      await expect(exportService.exportReport(data)).rejects.toThrow(
        "Invalid export format"
      );
    });

    it("should call correct export method based on format", async () => {
      const data = {
        format: "csv",
        query: "SELECT *",
        values: [],
        filename: "test",
        res: resMock,
      };

      // Spy on export methods
      jest.spyOn(exportService, "exportReportToCsv").mockResolvedValue();
      jest.spyOn(exportService, "exportReportToExcel").mockResolvedValue();

      await exportService.exportReport(data);
      expect(exportService.exportReportToCsv).toHaveBeenCalledWith(data);

      data.format = "excel";
      await exportService.exportReport(data);
      expect(exportService.exportReportToExcel).toHaveBeenCalledWith(data);
    });
  });

  describe("exportReportToCsv", () => {
    it("should export CSV with filters and groupings", async () => {
      const data = {
        query: "SELECT *",
        values: [],
        filename: "test",
        res: resMock,
        filters: { status: "Active" },
        groupings: { date: "month" },
        dbConnection: dbConnectionMock,
      };

      exportService.fetchRowsWithCursor = jest
        .fn()
        .mockImplementation(async function* () {
          yield [{ id: 1, name: "Test" }];
        });

      await exportService.exportReportToCsv(data);

      expect(resMock.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=test.csv",
      });
    });
  });

  describe("exportReportToExcel", () => {
    it("should export Excel with filters and groupings", async () => {
      const mockWorkbook = {
        addWorksheet: jest.fn().mockReturnValue({
          addRow: jest.fn().mockReturnValue({
            commit: jest.fn(),
          }),
          commit: jest.fn(),
        }),
        commit: jest.fn(),
      };
      jest
        .spyOn(ExcelJS.stream.xlsx, "WorkbookWriter")
        .mockReturnValue(mockWorkbook);

      const data = {
        query: "SELECT *",
        values: [],
        filename: "test",
        res: resMock,
        filters: { status: "Active" },
        groupings: { date: "month" },
        dbConnection: dbConnectionMock,
      };

      exportService.fetchRowsWithCursor = jest
        .fn()
        .mockImplementation(async function* () {
          yield [{ id: 1, name: "Test" }];
        });

      await exportService.exportReportToExcel(data);

      expect(resMock.writeHead).toHaveBeenCalledWith(200, {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename=test.xlsx",
      });
      expect(ExcelJS.stream.xlsx.WorkbookWriter).toHaveBeenCalled();
    });
  });

  describe("csvRowGenerator", () => {
    it("should generate CSV with metadata and rows", async () => {
      const data = {
        filters: { Status: "Active" },
        groupings: { Date: "Month" },
      };
      
      const dbRowGenerator = (async function* fetchRows(data) {
        yield [{ id: 1, name: "Test" }];
      });

      const generator = exportService.csvRowGenerator(data, dbRowGenerator);
      const output = [];

      for await (const chunk of generator) {
        output.push(chunk);
      }

      expect(output).toEqual([
        "\uFEFF",
        "\n# Applied Filters:\n",
        "Status,Active\n",
        "\n# Applied Grouping:\n",
        "Date,Month\n",
        "\n",
        "id,name\n",
        "1,Test\n",
      ]);
    });
    
  });
});
