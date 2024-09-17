const CrudService = require("../crudService");

describe("CrudService", () => {
  let crudService;
  let mockDbConnection;
  let mockEntitySchemaCollection;
  let req;

  beforeEach(() => {
    mockDbConnection = {
      query: jest.fn(),
    };

    mockEntitySchemaCollection = {
      testEntity: {
        name: "products",
        views: "products_view",
        properties: {
          name: { type: "string" },
          price: { type: "numeric" },
          short_description: { type: "string" },
          long_description: { type: "string" },
        },
      },
    };

    req = {
      params: { entity: "testEntity", id: "1" },
      body: {
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      },
      dbConnection: mockDbConnection,
      entitySchemaCollection: mockEntitySchemaCollection,
    };

    crudService = new CrudService();
  });

  describe("getById", () => {
    it("should return the product by ID", async () => {
      const expectedResponse = {
        id: 1,
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      };
      mockDbConnection.query.mockResolvedValue({ rows: [expectedResponse] });

      const result = await crudService.getById(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view WHERE id = $1",
        ["1"]
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should return null if product does not exist", async () => {
      mockDbConnection.query.mockResolvedValue({ rows: [] });

      const result = await crudService.getById(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view WHERE id = $1",
        ["1"]
      );
      expect(result).toBeUndefined();
    });
  });

  describe("getAll", () => {
    it("should return all products", async () => {
      const expectedResponse = [
        {
          id: 1,
          name: "Test Product 1",
          price: 100.5,
          short_description: "Short description 1",
          long_description: "Long description 1",
        },
        {
          id: 2,
          name: "Test Product 2",
          price: 200.75,
          short_description: "Short description 2",
          long_description: "Long description 2",
        },
      ];
      mockDbConnection.query.mockResolvedValue({ rows: expectedResponse });

      const result = await crudService.getAll(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view"
      );
      expect(result).toEqual(expectedResponse);
    });

    it("should return an empty array if no products exist", async () => {
      mockDbConnection.query.mockResolvedValue({ rows: [] });

      const result = await crudService.getAll(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "SELECT * FROM products_view"
      );
      expect(result).toEqual([]);
    });
  });
});
