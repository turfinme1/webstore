const CrudController = require("../crudController");

describe("CrudController", () => {
  let mockPool;
  let mockEntitySchemaCollection;
  let crudController;
  let mockQuery;
  let mockNext = jest.fn();

  beforeEach(() => {
    mockQuery = jest.fn().mockResolvedValueOnce({
      rows: [{ id: 1, name: "John" }],
    });
    mockPool = {
      connect: jest.fn().mockResolvedValue({ query: mockQuery }),
    };

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

    crudController = new CrudController(mockPool, mockEntitySchemaCollection);
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
        };
        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn(),
        };
  
        await crudController.create(mockRequest, mockResponse, mockNext);
  
        expect(mockPool.connect).toHaveBeenCalledTimes(1);
        expect(mockQuery).toHaveBeenCalledWith(
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
      };
      const mockResponse = {};
      const mockNext = jest.fn();
      const mockError = new Error("Database error");

      mockPool.connect.mockRejectedValueOnce(mockError);

      await crudController.create(mockRequest, mockResponse, mockNext);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe("getById", () => {
    it("should get an entity by ID and return the entity", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
      };
      const mockResponse = {
        json: jest.fn(),
      };
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{ id: 1, name: "John" }],
        }),
      };

      mockPool.connect.mockResolvedValueOnce(mockConnection);

      await crudController.getById(mockRequest, mockResponse);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
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
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [],
        }),
      };

      mockPool.connect.mockResolvedValueOnce(mockConnection);

      await crudController.getById(mockRequest, mockResponse);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
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
      };
      const mockResponse = {};
      const mockNext = jest.fn();
      const mockError = new Error("Database error");

      mockPool.connect.mockRejectedValueOnce(mockError);

      await crudController.getById(mockRequest, mockResponse, mockNext);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe("getAll", () => {
    it("should get all entities and return an array of entities", async () => {
      const mockRequest = {
        url: "/crud/entity1",
      };
      const mockResponse = {
        json: jest.fn(),
      };
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [
            { id: 1, name: "John" },
            { id: 2, name: "Jane" },
          ],
        }),
      };

      mockPool.connect.mockResolvedValueOnce(mockConnection);

      await crudController.getAll(mockRequest, mockResponse);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
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
      };
      const mockResponse = {};
      const mockNext = jest.fn();
      const mockError = new Error("Database error");

      mockPool.connect.mockRejectedValueOnce(mockError);

      await crudController.getAll(mockRequest, mockResponse, mockNext);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(mockError);
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
      };
      const mockResponse = {
        json: jest.fn(),
      };
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{ id: 1, name: "John Doe" }],
        }),
      };

      mockPool.connect.mockResolvedValueOnce(mockConnection);

      await crudController.update(mockRequest, mockResponse);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
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
      };
      const mockResponse = {};
      const mockNext = jest.fn();
      const mockError = new Error("Database error");

      mockPool.connect.mockRejectedValueOnce(mockError);

      await crudController.update(mockRequest, mockResponse, mockNext);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe("deleteEntity", () => {
    it("should delete an entity and return a success message", async () => {
      const mockRequest = {
        url: "/crud/entity1",
        params: {
          id: 1,
        },
      };
      const mockResponse = {
        json: jest.fn(),
      };
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{ id: 1 }],
        }),
      };

      mockPool.connect.mockResolvedValueOnce(mockConnection);

      await crudController.deleteEntity(mockRequest, mockResponse);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
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
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mockConnection = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [],
        }),
      };

      mockPool.connect.mockResolvedValueOnce(mockConnection);

      await crudController.deleteEntity(mockRequest, mockResponse);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockConnection.query).toHaveBeenCalledWith(
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
      };
      const mockResponse = {};
      const mockNext = jest.fn();
      const mockError = new Error("Database error");

      mockPool.connect.mockRejectedValueOnce(mockError);

      await crudController.deleteEntity(mockRequest, mockResponse, mockNext);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
});
