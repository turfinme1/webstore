const ProductService = require("../productService");

describe("ProductService", () => {
  let productService;
  let mockDbConnection;
  let mockEntitySchemaCollection;
  let params;

  beforeEach(() => {
    mockDbConnection = {
      query: jest.fn(),
    };

    mockEntitySchemaCollection = {
      products: {
        name: "products",
        views: "products_view",
        displayProperties: {
          name: { searchable: true },
          price: { searchable: false },
          short_description: { searchable: true },
          long_description: { searchable: true },
        },
        properties: {
          name: { type: "string" },
          price: { type: "numeric" },
          short_description: { type: "string" },
          long_description: { type: "string" },
        },
      },
    };

    productService = new ProductService();

    params = {
      query: {
        searchParams: {
          keyword: "test",
          categories: ["Electronics", "Books"],
        },
        filterParams: {
          categories: ["Electronics", "Books"],
          price: { min: 50, max: 150 },
        },
        orderParams: [["price", "ASC"]],
        page: "1",
        pageSize: "10",
      },
      dbConnection: mockDbConnection,
      entitySchemaCollection: mockEntitySchemaCollection,
    };
  });

  describe("getFilteredPaginated", () => {
    it("should fetch filtered and paginated products with total count", async () => {
      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100, categories: ["Electronics"] },
        { id: 2, name: "Test Product 2", price: 150, categories: ["Books"] },
      ];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "2" }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: expectedResponse }); // Mock the result query

      const result = await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual({
        result: expectedResponse,
        count: "2", // Ensure count is returned correctly (it's likely to be a string because SQL COUNT returns string type)
      });
    });

    it("should return an empty array with count if no products match the criteria", async () => {
      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] }) // Mock the count query
        .mockResolvedValueOnce({ rows: [] }); // Mock the result query

      const result = await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT COUNT(*) FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual({
        result: [],
        count: "0",
      });
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.getFilteredPaginated(params)).rejects.toThrow("Database error");
    });

    it("should apply correct search filters", async () => {
      params.query.searchParams = {
        keyword: "test",
        price: { min: 100, max: 200 },
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price >= $"),
        expect.any(Array)
      );
    });

    it("should apply correct sorting order", async () => {
      params.query.orderParams = [["name", "DESC"]];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY name DESC"),
        expect.any(Array)
      );
    });

    it("should handle pagination correctly", async () => {
      params.query.page = "2";
      params.query.pageSize = "5";

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0" }] })
        .mockResolvedValueOnce({ rows: [] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT $"),
        expect.any(Array)
      );
    });

    // Additional tests for ternary operator branches and defaults

    it("should use default empty object for searchParams if not provided", async () => {
      params.query.searchParams = {};

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default empty object for filterParams if not provided", async () => {
      params.query.filterParams = {};

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default empty array for orderParams if not provided", async () => {
      params.query.orderParams = [];

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default pageSize of 10 if not provided", async () => {
      params.query.pageSize = undefined;

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1"}] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default page of 1 if not provided", async () => {
      params.query.page = undefined;

      const expectedResponse = [{ id: 1, name: "Test Product 1", price: 100 }];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "1" }] })
        .mockResolvedValueOnce({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(params);

      expect(result).toEqual({
        result: expectedResponse,
        count: "1",
      });
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should apply only max price filter when price.min is not provided", async () => {
      params.query.filterParams = {
        price: { max: 150 },
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: "0"}] })
        .mockResolvedValueOnce({ rows: [] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price <= $"),
        expect.any(Array)
      );
    });

    it("should apply only min price filter when price.max is not provided", async () => {
      params.query.filterParams = {
        price: { min: 50 },
      };

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price >= $"),
        expect.any(Array)
      );
    });

    it("should apply correct query with empty filterParams", async () => {
      params.query.filterParams = {};
      params.query.searchParams = {};
      params.query.orderParams = [];

      mockDbConnection.query
        .mockResolvedValueOnce({ rows: [{ count: 0 }] })
        .mockResolvedValueOnce({ rows: [] });

      await productService.getFilteredPaginated(params);

      expect(mockDbConnection.query).not.toHaveBeenCalledWith(
        expect.stringContaining("WHERE "),
        expect.any(Array)
      );
    });
  });
});
