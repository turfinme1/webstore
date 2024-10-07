const ProductController = require("../productController");
const { ASSERT_USER } = require("../../serverConfigurations/assert");

jest.mock("../../serverConfigurations/assert");

describe("ProductController", () => {
  let productController;
  let productService;
  let mockRes;
  let mockReq;
  let mockNext;
  let mockDbConnection;
  let STATUS_CODES = 2;

  beforeEach(() => {
    productService = {
      getFilteredPaginated: jest.fn(),
      createComment: jest.fn(),
      createRating: jest.fn(),
      getComments: jest.fn(),
      getRatings: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
      session: { user_id: "1" },
    };

    productController = new ProductController(productService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
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

  describe("createComment", () => {
    it("should call ASSERT_USER and productService.createComment, then respond with status 200", async () => {
      const expectedResult = { message: "Comment added successfully" };
      productService.createComment.mockResolvedValue(expectedResult);

      await productController.createComment(mockReq, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(mockReq.session.user_id, "You must be logged in to perform this action", STATUS_CODES);
      expect(productService.createComment).toHaveBeenCalledWith({
        body: mockReq.body,
        params: mockReq.params,
        session: mockReq.session,
        dbConnection: mockReq.dbConnection,
        entitySchemaCollection: mockReq.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe("createRating", () => {
    it("should call ASSERT_USER and productService.createRating, then respond with status 200", async () => {
      const expectedResult = { message: "Rating added successfully" };
      productService.createRating.mockResolvedValue(expectedResult);

      await productController.createRating(mockReq, mockRes, mockNext);

      expect(ASSERT_USER).toHaveBeenCalledWith(mockReq.session.user_id, "You must be logged in to perform this action", STATUS_CODES);
      expect(productService.createRating).toHaveBeenCalledWith({
        body: mockReq.body,
        params: mockReq.params,
        session: mockReq.session,
        dbConnection: mockReq.dbConnection,
        entitySchemaCollection: mockReq.entitySchemaCollection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe("getComments", () => {
    it("should call productService.getComments and respond with status 200", async () => {
      const expectedResult = [{ id: 1, comment: "Great product!" }];
      productService.getComments.mockResolvedValue(expectedResult);

      await productController.getComments(mockReq, mockRes, mockNext);

      expect(productService.getComments).toHaveBeenCalledWith({
        params: mockReq.params,
        dbConnection: mockReq.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe("getRatings", () => {
    it("should call productService.getRatings and respond with status 200", async () => {
      const expectedResult = [{ id: 1, rating: 5 }];
      productService.getRatings.mockResolvedValue(expectedResult);

      await productController.getRatings(mockReq, mockRes, mockNext);

      expect(productService.getRatings).toHaveBeenCalledWith({
        params: mockReq.params,
        dbConnection: mockReq.dbConnection,
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(expectedResult);
    });
  });

  describe('create', () => {
    it('should call productService.create and respond with status 201', async () => {
      const req = { body: { name: 'Test Product' }, params: { entity: 'testEntity' }, session: { admin_user_id: 1 } };
      const requestObject = { body: req.body, req, params: req.params, dbConnection: req.dbConnection, entitySchemaCollection: req.entitySchemaCollection };
      const createdProduct = { id: 1, name: 'Test Product' };

      productService.create.mockResolvedValue([createdProduct]);

      await productController.create(req, mockRes, mockNext);

      expect(productService.create).toHaveBeenCalledWith(requestObject);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith([createdProduct]);
    });
  });

  describe('update', () => {
    it('should call productService.update and respond with status 200', async () => {
      const req = {
        params: { entity: 'testEntity', id: 1 },
        body: { name: 'Updated Product' },
        session: { admin_user_id: 1 } 
      };
      const requestObject = { body: req.body, req, params: req.params, dbConnection: req.dbConnection, entitySchemaCollection: req.entitySchemaCollection };

      const updatedProduct = { id: 1, name: 'Updated Product' };

      productService.update.mockResolvedValue(updatedProduct);

      await productController.update(req, mockRes, mockNext);

      expect(productService.update).toHaveBeenCalledWith(requestObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedProduct);
    });
  });

  describe('delete', () => {
    it('should call crudService.delete and respond with status 200', async () => {
      const req = { params: { entity: 'testEntity', id: 1 },  session: { admin_user_id: 1 }  };
      const expectedCallObject = { params: { entity: 'testEntity', id: 1 }};
      const deletedProduct = { id: 1, name: 'Deleted Product' };

      productService.delete.mockResolvedValue(deletedProduct);

      await productController.delete(req, mockRes, mockNext);

      expect(productService.delete).toHaveBeenCalledWith(expectedCallObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(deletedProduct);
    });
  });
});