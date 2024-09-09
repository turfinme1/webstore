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

    crudService = new CrudService(mockEntitySchemaCollection);

    req = {
      params: { entity: "testEntity", id: "1" },
      body: {
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      },
      dbConnection: mockDbConnection,
    };
  });

  describe("create", () => {
    it("should create a new product and return the result", async () => {
      const expectedResponse = {
        id: 1,
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      };
      mockDbConnection.query.mockResolvedValue({ rows: [expectedResponse] });

      const result = await crudService.create(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "INSERT INTO products(name,price,short_description,long_description) VALUES($1,$2,$3,$4) RETURNING *",
        ["Test Product", 100.5, "Short description", "Long description"]
      );
      expect(result).toEqual([expectedResponse]);
    });

    it("should throw an error if required fields are missing", async () => {
      req.body = { price: 50.0 }; // Missing required fields: name, short_description, long_description

      await expect(crudService.create(req)).rejects.toThrow();
    });
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

  describe("update", () => {
    it("should update the product and return the updated result", async () => {
      const expectedResponse = {
        id: 1,
        name: "Updated Product",
        price: 150.0,
        short_description: "Updated short description",
        long_description: "Updated long description",
      };

      req.body = {
        name: "Updated Product",
        price: 150.0,
        short_description: "Updated short description",
        long_description: "Updated long description",
      };

      mockDbConnection.query.mockResolvedValue({ rows: [expectedResponse] });

      const result = await crudService.update(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "UPDATE products SET name = $1, price = $2, short_description = $3, long_description = $4 WHERE id = $5 RETURNING *",
        [
          "Updated Product",
          150.0,
          "Updated short description",
          "Updated long description",
          "1",
        ]
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe("delete", () => {
    it("should delete the product and return the deleted entity", async () => {
      const expectedResponse = {
        id: 1,
        name: "Test Product",
        price: 100.5,
        short_description: "Short description",
        long_description: "Long description",
      };

      mockDbConnection.query.mockResolvedValue({ rows: [expectedResponse] });

      const result = await crudService.delete(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        ["1"]
      );
      expect(result).toEqual(expectedResponse);
    });
  });
});
