const CrudController = require("../crudController");

describe("CrudController", () => {
  let mockEntitySchemaCollection;
  let crudController;
  let mockNext = jest.fn();

  beforeEach(() => {
    mockEntitySchemaCollection = {
      entity1: {
        name: "entity1",
        views: "entity1_views",
        properties: {
          id: "number",
          name: "string",
        },
      },
      entity2: {
        name: "entity2",
        views: "entity2_views",
        properties: {
          id: "number",
          age: "number",
        },
      },
    };

    crudController = new CrudController(mockEntitySchemaCollection);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new entity and return the created entity", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        body: {
          id: 1,
          name: "John",
        },
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 1, name: "John" }],
          }),
        },
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await crudController.create(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "INSERT INTO entity1(id,name) VALUES($1,$2) RETURNING *",
        [1, "John"]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ id: 1, name: "John" });
    });

    it("should handle errors and call the error handling middleware", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        body: {
          id: 1,
          name: "John",
        },
        dbConnection: {
          query: jest.fn().mockRejectedValue(new Error("Database error")),
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await crudController.create(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error("Database error"));
    });
  });

  describe("getById", () => {
    it("should get an entity by ID and return the entity", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 1, name: "John" }],
          }),
        },
      };
      const mockResponse = {
        json: jest.fn(),
      };

      await crudController.getById(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM entity1_views WHERE id = $1",
        [1]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ id: 1, name: "John" });
    });

    it("should handle entity not found and return a 404 error", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [],
          }),
        },
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await crudController.getById(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM entity1_views WHERE id = $1",
        [1]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Entity not found",
      });
    });

    it("should handle errors and call the error handling middleware", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        dbConnection: {
          query: jest.fn().mockRejectedValue(new Error("Database error")),
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await crudController.getById(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error("Database error"));
    });
  });

  describe("getAll", () => {
    it("should get all entities and return an array of entities", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [
              { id: 1, name: "John" },
              { id: 2, name: "Jane" },
            ],
          }),
        },
      };
      const mockResponse = {
        json: jest.fn(),
      };

      await crudController.getAll(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM entity1_views"
      );
      expect(mockResponse.json).toHaveBeenCalledWith([
        { id: 1, name: "John" },
        { id: 2, name: "Jane" },
      ]);
    });

    it("should handle errors and call the error handling middleware", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        dbConnection: {
          query: jest.fn().mockRejectedValue(new Error("Database error")),
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await crudController.getAll(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error("Database error"));
    });
  });

  describe("update", () => {
    it("should update an entity and return the updated entity", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        body: {
          id: 1,
          name: "John Doe",
        },
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 1, name: "John Doe" }],
          }),
        },
      };
      const mockResponse = {
        json: jest.fn(),
      };

      await crudController.update(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "UPDATE entity1 SET id = $1, name = $2 WHERE id = $3 RETURNING *",
        [1, "John Doe", 1]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        id: 1,
        name: "John Doe",
      });
    });

    it("should handle errors and call the error handling middleware", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        body: {
          id: 1,
          name: "John Doe",
        },
        dbConnection: {
          query: jest.fn().mockRejectedValue(new Error("Database error")),
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await crudController.update(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error("Database error"));
    });
  });

  describe("deleteEntity", () => {
    it("should delete an entity and return a success message", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [{ id: 1 }],
          }),
        },
      };
      const mockResponse = {
        json: jest.fn(),
      };

      await crudController.deleteEntity(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "DELETE FROM entity1 WHERE id = $1 RETURNING *",
        [1]
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Entity deleted",
      });
    });

    it("should handle entity not found and return a 404 error", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        dbConnection: {
          query: jest.fn().mockResolvedValueOnce({
            rows: [],
          }),
        },
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await crudController.deleteEntity(mockRequest, mockResponse, mockNext);

      expect(mockRequest.dbConnection.query).toHaveBeenCalledWith(
        "DELETE FROM entity1 WHERE id = $1 RETURNING *",
        [1]
      );
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Entity not found",
      });
    });

    it("should handle errors and call the error handling middleware", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
        dbConnection: {
          query: jest.fn().mockRejectedValue(new Error("Database error")),
        },
      };
      const mockResponse = {};
      const mockNext = jest.fn();

      await crudController.deleteEntity(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(new Error("Database error"));
    });
  });
});
