import Repository from "../repository.js";
import { jest } from "@jest/globals";

let repository;
let pool;
let mockQuery;
let mockClient;
let tableName;

beforeEach(() => {
  pool = { connect: jest.fn() };
  mockQuery = jest.fn();
  tableName = "test_table";
  mockClient = { query: mockQuery, release: jest.fn() };
  pool.connect.mockResolvedValue(mockClient);
  repository = new Repository(pool, tableName);
});
describe("Repository", () => {
  describe("Repository methods using mock _query", () => {
    beforeEach(() => {
      repository._query = mockQuery;
    });

    describe("getStatistics", () => {
      it("should return statistics for settlements, town halls, municipalities, and regions", async () => {
        const expectedStatistics = {
          countSettlements: "10",
          countTownHalls: "5",
          countMunicipalities: "3",
          countRegions: "2",
        };
        const query = `
          SELECT 
            (SELECT COUNT(*) FROM settlement) AS countSettlements,
            (SELECT COUNT(*) FROM town_hall) AS countTownHalls,
            (SELECT COUNT(*) FROM municipality) AS countMunicipalities,
            (SELECT COUNT(*) FROM region) AS countRegions LIMIT 1;`;

        mockQuery.mockResolvedValue([expectedStatistics]);

        const result = await repository.getStatistics();

        const normalizedQuery = normalizeQuery(query);
        const actualQuery = mockQuery.mock.calls[0][0];
        const normalizedActualQuery = normalizeQuery(actualQuery);

        expect(result).toEqual({
          success: true,
          data: expectedStatistics,
          statusCode: 200,
        });
        expect(normalizedActualQuery).toBe(normalizedQuery);
        expect(mockQuery).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("_query", () => {
    it("should return rows when query is successful", async () => {
      const query = "SELECT * FROM test";
      const values = [];
      const expectedRows = [{ id: 1, name: "test" }];
      mockClient.query.mockResolvedValue({ rows: expectedRows });

      const result = await repository._query(query, values);

      expect(result).toEqual(expectedRows);
      expect(mockClient.query).toHaveBeenCalledWith(query, values);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should default to an empty array for values when not provided", async () => {
      const query = "SELECT * FROM test";
      const expectedRows = [{ id: 1, name: "test" }];
      mockClient.query.mockResolvedValue({ rows: expectedRows });

      const result = await repository._query(query);

      expect(result).toEqual(expectedRows);
      expect(mockClient.query).toHaveBeenCalledWith(query, []);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should throw a 409 error for unique constraint violation", async () => {
      const query = "INSERT INTO test(name) VALUES($1)";
      const values = ["duplicate"];
      const error = { code: "23505" };
      mockClient.query.mockRejectedValue(error);

      await expect(repository._query(query, values)).rejects.toEqual({
        success: false,
        statusCode: 409,
        data: null,
        errors: "Entity already exists",
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should throw a 404 error for foreign key constraint violation", async () => {
      const query = "UPDATE test SET name = $1 WHERE id = $2";
      const values = ["newName", 999];
      const error = { code: "23503" };
      mockClient.query.mockRejectedValue(error);

      await expect(repository._query(query, values)).rejects.toEqual({
        success: false,
        statusCode: 404,
        data: null,
        errors: "Entity ID not found",
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should throw a 500 error for other errors", async () => {
      const query = "DELETE FROM test WHERE id = $1";
      const values = [1];
      const error = { code: "UNKNOWN_ERROR" };
      mockClient.query.mockRejectedValue(error);

      await expect(repository._query(query, values)).rejects.toEqual({
        success: false,
        statusCode: 500,
        data: null,
        errors: "Internal Server Error",
      });

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});

function normalizeQuery(query) {
  return query.replace(/\s+/g, " ").trim();
}
