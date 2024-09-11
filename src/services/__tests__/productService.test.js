const e = require("express");
const ProductService = require("../productService");

describe("ProductService", () => {
  let productService;
  let mockDbConnection;
  let mockEntitySchemaCollection;
  let req;

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

    productService = new ProductService(mockEntitySchemaCollection);

    req = {
      query: {
        searchParams: JSON.stringify({
          keyword: "test",
          price: { min: 50, max: 150 },
          categories: ["Electronics", "Books"],
        }),
        orderParams: JSON.stringify([["price", "ASC"]]),
        page: "1",
        pageSize: "10",
      },
      dbConnection: mockDbConnection,
      entitySchemaCollection: mockEntitySchemaCollection,
    };
  });

  describe("getFilteredPaginated", () => {
    it("should fetch filtered and paginated products", async () => {
      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100, categories: ["Electronics"] },
        { id: 2, name: "Test Product 2", price: 150, categories: ["Books"] },
      ];

      mockDbConnection.query.mockResolvedValue({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual(expectedResponse);
    });

    it("should return an empty array if no products match the criteria", async () => {
      mockDbConnection.query.mockResolvedValue({ rows: [] });

      const result = await productService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM products_view"),
        expect.any(Array)
      );

      expect(result).toEqual([]);
    });

    it("should throw an error if the database query fails", async () => {
      mockDbConnection.query.mockRejectedValue(new Error("Database error"));

      await expect(productService.getFilteredPaginated(req)).rejects.toThrow("Database error");
    });

    it("should apply correct search filters", async () => {
      req.query.searchParams = JSON.stringify({
        keyword: "test",
        price: { min: 100, max: 200 },
      });

      mockDbConnection.query.mockResolvedValue({ rows: [] });

      await productService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("price >= $"),
        expect.any(Array)
      );
    });

    it("should apply correct sorting order", async () => {
      req.query.orderParams = JSON.stringify([["name", "DESC"]]);

      mockDbConnection.query.mockResolvedValue({ rows: [] });

      await productService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("ORDER BY name DESC"),
        expect.any(Array)
      );
    });

    it("should handle pagination correctly", async () => {
      req.query.page = "2";
      req.query.pageSize = "5";

      mockDbConnection.query.mockResolvedValue({ rows: [] });

      await productService.getFilteredPaginated(req);

      expect(mockDbConnection.query).toHaveBeenCalledWith(
        expect.stringContaining("LIMIT $"),
        expect.any(Array)
      );
    });

    // Additional tests for ternary operator branches
    it("should use default empty object for searchParams if not provided", async () => {
      req.query.searchParams = undefined;

      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100 },
      ];

      mockDbConnection.query.mockResolvedValue({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(req);

      expect(result).toEqual(expectedResponse);
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default empty array for orderParams if not provided", async () => {
      req.query.orderParams = undefined;

      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100 },
      ];

      mockDbConnection.query.mockResolvedValue({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(req);

      expect(result).toEqual(expectedResponse);
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default pageSize of 10 if not provided", async () => {
      req.query.pageSize = undefined;

      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100 },
      ];

      mockDbConnection.query.mockResolvedValue({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(req);

      expect(result).toEqual(expectedResponse);
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should use default page of 1 if not provided", async () => {
      req.query.page = undefined;

      const expectedResponse = [
        { id: 1, name: "Test Product 1", price: 100 },
      ];

      mockDbConnection.query.mockResolvedValue({ rows: expectedResponse });

      const result = await productService.getFilteredPaginated(req);

      expect(result).toEqual(expectedResponse);
      expect(mockDbConnection.query).toHaveBeenCalled();
    });

    it("should not add any price filter if searchParams.price is not provided", async () => {
        req.query.searchParams = JSON.stringify({
          keyword: "test",
        });
      
        mockDbConnection.query.mockResolvedValue({ rows: [] });
      
        await productService.getFilteredPaginated(req);
      
        expect(mockDbConnection.query).not.toHaveBeenCalledWith(
          expect.stringContaining("price >= $"),
          expect.any(Array)
        );
        expect(mockDbConnection.query).not.toHaveBeenCalledWith(
          expect.stringContaining("price <= $"),
          expect.any(Array)
        );
      });
      
      it("should apply only max price filter when price.min is not provided", async () => {
        req.query.searchParams = JSON.stringify({
          price: { max: 150 },
        });
      
        mockDbConnection.query.mockResolvedValue({ rows: [] });
      
        await productService.getFilteredPaginated(req);
      
        expect(mockDbConnection.query).not.toHaveBeenCalledWith(
          expect.stringContaining("price >= $"),
          expect.any(Array)
        );
        expect(mockDbConnection.query).toHaveBeenCalledWith(
          expect.stringContaining("price <= $"),
          expect.any(Array)
        );
      });
      
      it("should apply only min price filter when price.max is not provided", async () => {
        req.query.searchParams = JSON.stringify({
          price: { min: 50 },
        });
      
        mockDbConnection.query.mockResolvedValue({ rows: [] });
      
        await productService.getFilteredPaginated(req);
      
        expect(mockDbConnection.query).toHaveBeenCalledWith(
          expect.stringContaining("price >= $"),
          expect.any(Array)
        );
        expect(mockDbConnection.query).not.toHaveBeenCalledWith(
          expect.stringContaining("price <= $"),
          expect.any(Array)
        );
      });
  });
});
