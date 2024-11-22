const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const ExcelJS = require("exceljs");
const ExportService = require("./exportService");
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

            exportService.executeQueryWithCursor = jest.fn().mockResolvedValueOnce((async function* fetchRows () {
                yield [{ id: 1 }];
            })());
           

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
            dbConnectionMock.query.mockResolvedValueOnce({ rows: [{ total_price: "100" }] });
            dbConnectionMock.query.mockResolvedValueOnce({ rows: [{ total_total_price: "100" }] });

            await exportService.exportToExcel(data);

            expect(resMock.writeHead).toHaveBeenCalledWith(200, {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": "attachment; filename=testEntity.xlsx",
            });
            expect(crudServiceMock.buildFilteredPaginatedQuery).toHaveBeenCalledWith(data, true);
            expect(dbConnectionMock.query).toHaveBeenCalledWith("SELECT SUM(total_price) FROM test", []);
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
            exportService.executeQueryWithCursor = jest.fn().mockResolvedValueOnce((async function* fetchRows () {
                yield [{ id: 1 }];
            })());

            crudServiceMock.buildFilteredPaginatedQuery.mockReturnValue(parameters);
            dbConnectionMock.query.mockResolvedValueOnce({ rows: [{ total_price: "100" }] });
            dbConnectionMock.query.mockResolvedValueOnce({ rows: [{ total_total_price: "100" }] });

            await exportService.exportToCsv(data);

            expect(resMock.writeHead).toHaveBeenCalledWith(200, {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=testEntity.csv",
            });
            expect(crudServiceMock.buildFilteredPaginatedQuery).toHaveBeenCalledWith(data, true);
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

            expect(dbConnectionMock.query).toHaveBeenCalledWith("DECLARE export_cursor CURSOR FOR SELECT * FROM test", []);
            expect(dbConnectionMock.query).toHaveBeenCalledWith("FETCH 10000 FROM export_cursor");
            expect(dbConnectionMock.query).toHaveBeenCalledWith("CLOSE export_cursor");
            expect(rows).toEqual([[{ id: 1 }]]);
        });
    });

});