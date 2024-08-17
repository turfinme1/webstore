import CrudRepository from "../crudRepository.js";
import { jest } from "@jest/globals";

let repository;
let pool;
let schema;
let mockQuery;
let mockClient;

beforeEach(() => {
  pool = { connect: jest.fn() };
  schema = {
    name: "test",
    properties: {
      name_en: { searchable: true },
      name: { searchable: true },
    },
  };
  mockQuery = jest.fn();
  mockClient = { query: mockQuery, release: jest.fn() };
  pool.connect.mockResolvedValue(mockClient);
  repository = new CrudRepository(pool, schema);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("CrudRepository", () => {
  describe("Repository methods using mock _query", () => {
    beforeEach(() => {
      repository._query = mockQuery;
    });

    describe("getAll", () => {
      it("should return all rows ordered by id in descending order", async () => {
        const expectedRows = [
          { id: 2, name: "second" },
          { id: 1, name: "first" },
        ];
        const mockQuery = `SELECT * FROM ${schema.name} ORDER BY id DESC`;
        jest.spyOn(repository, "_query").mockResolvedValue(expectedRows);

        const result = await repository.getAll();

        expect(result).toEqual({
          success: true,
          data: expectedRows,
          statusCode: 200,
        });
        expect(repository._query).toHaveBeenCalledWith(mockQuery);
      });

      it("should handle errors and return a 500 error response", async () => {
        const mockQuery = `SELECT * FROM ${schema.name} ORDER BY id DESC`;
        const error = {
          success: false,
          statusCode: 500,
          data: null,
          errors: "Internal Server Error",
        };
        jest.spyOn(repository, "_query").mockRejectedValue(error);

        await expect(repository.getAll()).rejects.toEqual(error);

        expect(repository._query).toHaveBeenCalledWith(mockQuery);
      });
    });

    describe("getById", () => {
      it("should return the entity with the given id", async () => {
        const id = 1;
        const data = { name_en: 1, name: "test" };
        mockQuery.mockResolvedValue([data]);

        const result = await repository.getById(id);

        expect(result).toEqual({ success: true, data, statusCode: 200 });
        expect(mockQuery).toHaveBeenCalledWith(
          `SELECT * FROM ${schema.name} WHERE id = $1`,
          [id]
        );
      });
    });

    describe("getById", () => {
      it("should return the entity with the given id", async () => {
        const id = 1;
        const data = { id: 1, name: "test" };
        mockQuery.mockResolvedValue([data]);

        const result = await repository.getById(id);

        expect(result).toEqual({ success: true, data, statusCode: 200 });
        expect(mockQuery).toHaveBeenCalledWith(
          `SELECT * FROM ${schema.name} WHERE id = $1`,
          [id]
        );
      });
    });

    describe("create", () => {
      it("should create a new entity", async () => {
        const data = { name_en: 1, name: "test" };
        const createdData = { name_en: 1, name: "test" };
        mockQuery.mockResolvedValue([createdData]);

        const result = await repository.create(data);

        expect(result).toEqual({
          success: true,
          data: createdData,
          statusCode: 201,
        });
        expect(mockQuery).toHaveBeenCalledWith(
          `INSERT INTO ${schema.name}(name_en,name) VALUES($1,$2) RETURNING *`,
          [data.name_en, data.name]
        );
      });
    });

    describe("update", () => {
      it("should update an entity with the given id", async () => {
        const id = 1;
        const data = { name_en: "test-en", name: "test" };
        const updatedData = { name_en: "test-en", name: "test" };
        mockQuery.mockResolvedValue([updatedData]);
        const expectedQuery = `
        UPDATE ${schema.name}
        SET name_en = $1, name = $2
        WHERE id = $3
        RETURNING *;`;

        const result = await repository.update(id, data);

        const actualQuery = mockQuery.mock.calls[0][0];
        const normalizedExpectedQuery = normalizeQuery(expectedQuery);
        const normalizedActualQuery = normalizeQuery(actualQuery);

        expect(result).toEqual({
          success: true,
          data: updatedData,
          statusCode: 200,
        });
        expect(normalizedActualQuery).toBe(normalizedExpectedQuery);
        expect(mockQuery).toHaveBeenCalledWith(expectedQuery, [
          data.name_en,
          data.name,
          id,
        ]);
      });
    });

    describe("delete", () => {
      it("should delete an entity with the given id", async () => {
        const id = 1;
        const deletedData = { id: 1, name: "test" };
        mockQuery.mockResolvedValue([deletedData]);

        const result = await repository.delete(id);

        expect(result).toEqual({
          success: true,
          data: deletedData,
          statusCode: 200,
        });
        expect(mockQuery).toHaveBeenCalledWith(
          `DELETE FROM ${schema.name} WHERE id = $1 RETURNING *;`,
          [id]
        );
      });
    });

    describe("getEntities", () => {
      it("should return entities that match the search criteria", async () => {
        const param = { name: "test" };
        const data = [{ id: 1, name: "test" }];
        const normalizedExpectedQuery = normalizeQuery(`
          SELECT * FROM test 
          WHERE STRPOS(LOWER(name_en), LOWER($1)) > 0 OR STRPOS(LOWER(name), LOWER($1)) > 0 
          ORDER BY name_en;`);
        mockQuery.mockResolvedValue(data);

        const result = await repository.getEntities(param);

        const normalizedActualQuery = normalizeQuery(
          mockQuery.mock.calls[0][0]
        );
        const actualSearchParameter = mockQuery.mock.calls[0][1];

        expect(normalizedActualQuery).toBe(normalizedExpectedQuery);
        expect(actualSearchParameter).toEqual([param]);
        expect(result).toEqual({ success: true, data, statusCode: 200 });
      });

      it("should throw an error if no searchable fields are found", async () => {
        const schemaWithNoSearchableFields = {
          name: "test",
          properties: {
            name_en: { searchable: false },
            name: { searchable: false },
          },
        };
        const repositoryWithNoSearchableFields = new CrudRepository(
          pool,
          schemaWithNoSearchableFields
        );

        const result = repositoryWithNoSearchableFields.getEntities("test");

        await expect(result).rejects.toThrow("No searchable fields found");
      });

      it("should return an error if _query fails", async () => {
        const customError = {
          success: false,
          statusCode: 500,
          data: null,
          errors: "Internal Server Error",
        };
        mockQuery.mockRejectedValue(customError);

        const result = repository.getEntities({ name: "test" });
        
        await expect(result).rejects.toMatchObject(customError);
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
