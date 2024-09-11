const ProductController = require("../productController");

describe("ProductController", () => {
  let productController;
  let productService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    productService = {
      getFilteredPaginated: jest.fn(),
    };
    productController = new ProductController(
      productService,
      
    );

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe("getFilteredPaginated", () => {
    it("should call validateQueryParams and productService.getFilteredPaginated, then respond with status 200", async () => {
      const req = {
        query: {
          searchParams: JSON.stringify({ keyword: "test" }),
          orderParams: JSON.stringify([]),
          page: "1",
          pageSize: "10",
        },
        dbConnection: {},
        entitySchemaCollection: {
          products: {
            name: "products",
            seachParams: {
              keyword: {
                type: "string",
              },
            },
          },
        },
      };
      const expectedResult = [
        { id: 1, name: "Test Product 1" },
        { id: 2, name: "Test Product 2" },
      ];

      productService.getFilteredPaginated.mockResolvedValue(expectedResult);

      await productController.getFilteredPaginated(req, mockRes, mockNext);

      expect(productService.getFilteredPaginated).toHaveBeenCalledWith(req);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });

    it("should respond with status 200 and empty array if no products are found", async () => {
      const req = {
        query: {
          searchParams: JSON.stringify({ keyword: "test" }),
          orderParams: JSON.stringify([]),
          page: "1",
          pageSize: "10",
        },
        dbConnection: {},
        entitySchemaCollection: {
          products: {
            name: "products",
            seachParams: {
              keyword: {
                type: "string",
              },
            },
          },
        },
      };

      productService.getFilteredPaginated.mockResolvedValue([]);

      await productController.getFilteredPaginated(req, mockRes, mockNext);

      expect(productService.getFilteredPaginated).toHaveBeenCalledWith(req);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([]);
    });
  });
});
