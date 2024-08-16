import CrudRepository from "../crudRepository.js";
import { jest } from "@jest/globals";
let repository;
let pool;
let schema;
let mockQuery;

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
  pool.connect.mockResolvedValue({
    query: mockQuery,
    release: jest.fn(),
  });
  repository = new CrudRepository(pool, schema);
  repository._query = mockQuery;
});

describe("Sample Test", () => {
  it("should pass", () => {
    expect(true).toBe(true);
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
    console.error(data);

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
    mockQuery.mockResolvedValue(data);

    const result = await repository.getEntities(param);

    const normalizedExpectedQuery = normalizeQuery(`
        SELECT * FROM test 
        WHERE STRPOS(LOWER(name_en), LOWER($1)) > 0 OR STRPOS(LOWER(name), LOWER($1)) > 0 
        ORDER BY name_en;`);
    const normalizedActualQuery = normalizeQuery(mockQuery.mock.calls[0][0]);
    const actualSearchParameter = mockQuery.mock.calls[0][1];

    expect(normalizedActualQuery).toBe(normalizedExpectedQuery);
    expect(actualSearchParameter).toEqual([param]);
    expect(result).toEqual({ success: true, data, statusCode: 200 });
  });
});

describe("Error handling in _query", () => {
  it("should handle unique constraint violations", async () => {
    const customError = {
      success: false,
      statusCode: 409,
      data: null,
      errors: "Entity already exists",
    };
    mockQuery.mockRejectedValue(customError);

    await expect(
      repository.create({ name: "duplicate" })
    ).rejects.toMatchObject(customError);
  });

  it("should handle foreign key constraint violations", async () => {
    const customError = {
      success: false,
      statusCode: 404,
      data: null,
      errors: "Entity ID not found",
    };
    mockQuery.mockRejectedValue(customError);

    await expect(
      repository.update(1, { name: "update" })
    ).rejects.toMatchObject(customError);
  });

  it("should handle other errors", async () => {
    const customError = {
      success: false,
      statusCode: 500,
      data: null,
      errors: "Internal Server Error",
    };
    mockQuery.mockRejectedValue(customError);

    await expect(repository.create({ name: "error" })).rejects.toMatchObject(
      customError
    );
  });
});

describe("Error handling in getEntities", () => {
  it("should return an error if _query fails", async () => {
    const customError = {
      success: false,
      statusCode: 500,
      data: null,
      errors: "Internal Server Error",
    };
    mockQuery.mockRejectedValue(customError);

    await expect(
      repository.getEntities({ name: "test" })
    ).rejects.toMatchObject(customError);
  });
});

describe("_query", () => {
  it("should return rows when query is successful", async () => {
    const query = "SELECT * FROM test";
    const values = [];
    const expectedRows = [{ id: 1, name: "test" }];
    mockQuery.mockResolvedValue({ rows: expectedRows });

    const result = await repository._query(query, values);

    expect(result).toEqual(expectedRows);
    expect(mockQuery).toHaveBeenCalledWith(query, values);
  });

  it("should throw a 409 error for unique constraint violation", async () => {
    const query = "INSERT INTO test(name) VALUES($1)";
    const values = ["duplicate"];
    const error = { code: "23505" };
    mockQuery.mockRejectedValue(error);

    await expect(repository._query(query, values)).rejects.toEqual({
      success: false,
      statusCode: 409,
      data: null,
      errors: "Entity already exists",
    });
  });

  it("should throw a 404 error for foreign key constraint violation", async () => {
    const query = "UPDATE test SET name = $1 WHERE id = $2";
    const values = ["newName", 999];
    const error = { code: "23503" };
    mockQuery.mockRejectedValue(error);

    await expect(repository._query(query, values)).rejects.toEqual({
      success: false,
      statusCode: 404,
      data: null,
      errors: "Entity ID not found",
    });
  });

  it("should throw a 500 error for other errors", async () => {
    const query = "DELETE FROM test WHERE id = $1";
    const values = [1];
    const error = { code: "UNKNOWN_ERROR" };
    mockQuery.mockRejectedValue(error);

    await expect(repository._query(query, values)).rejects.toEqual({
      success: false,
      statusCode: 500,
      data: null,
      errors: "Internal Server Error",
    });
  });
});

function normalizeQuery(query) {
  return query.replace(/\s+/g, " ").trim();
}
