const ProductController = require("../productController");

describe("ProductController", () => {
  let productController;
  let productService;
  let mockRes;
  let mockReq;
  let mockNext;
  let mockDbConnection;

  beforeEach(() => {
    productService = {
      getFilteredPaginated: jest.fn(),
    };

    mockDbConnection = {
      query: jest.fn(),
    };

    mockReq = {
      query: {
        searchParams: JSON.stringify({ keyword: "test" }),
        filterParams: JSON.stringify({
          categories: ["Electronics", "Books"],
          price: { min: 50, max: 150 },
        }),
        orderParams: JSON.stringify([["price", "ASC"]]),
        page: "1",
        pageSize: "10",
      },
      dbConnection: mockDbConnection,
      entitySchemaCollection: {
        productQueryParamsSchema: {
          searchParams: {
            type: "object",
            properties: {
              keyword: { type: "string" },
              categories: { type: "array" },
            },
          },
          filterParams: {
            type: "object",
            properties: {
              categories: { type: "array" },
              price: {
                type: "object",
                properties: {
                  min: { type: "number" },
                  max: { type: "number" },
                },
              },
            },
          },
          orderParams: {
            type: "array",
            properties: {
              price: {
                type: "string",
              },
            },
          },
          pageSize: {
            type: "number",
            minimum: 1,
            maximum: 100,
          },
          page: {
            type: "number",
            minimum: 1,
          },
        },
      },
    };

    productController = new ProductController(productService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe("getFilteredPaginated", () => {
    it("should call validateQueryParams and productService.getFilteredPaginated, then respond with status 200", async () => {
      const expectedResult = [
        { id: 1, name: "Test Product 1" },
        { id: 2, name: "Test Product 2" },
      ];

      productService.getFilteredPaginated.mockResolvedValue(expectedResult);

      await productController.getFilteredPaginated(mockReq, mockRes, mockNext);

      expect(productService.getFilteredPaginated).toHaveBeenCalledWith({
        query: mockReq.query,
        entitySchemaCollection: mockReq.entitySchemaCollection,
        dbConnection: mockReq.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it("should respond with status 200 and an empty array if no products are found", async () => {
      productService.getFilteredPaginated.mockResolvedValue([]);

      await productController.getFilteredPaginated(mockReq, mockRes, mockNext);

      expect(productService.getFilteredPaginated).toHaveBeenCalledWith({
        query: mockReq.query,
        entitySchemaCollection: mockReq.entitySchemaCollection,
        dbConnection: mockReq.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });
  });
});