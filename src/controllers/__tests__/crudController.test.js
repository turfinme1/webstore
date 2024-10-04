const CrudController = require('../crudController');
const { ASSERT_USER } = require("../../serverConfigurations/assert");

jest.mock("../../serverConfigurations/assert");

describe('CrudController', () => {
  let crudController;
  let crudService;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    crudService = {
      getFilteredPaginated: jest.fn(),
      create: jest.fn(),
      getById: jest.fn(),
      getAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    crudController = new CrudController(crudService);

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();
  });

  describe('getFilteredPaginated', () => {
    it('should call crudService.getFilteredPaginated and respond with status 200', async () => {
        const req = {
            query: {
                page: 1,
                pageSize: 10,
                filterParams: JSON.stringify({ categories: ['category1'], price: { min: 10, max: 100 } }),
                searchParams: JSON.stringify({ keyword: 'Test' }),
            },
            params: { entity: 'testEntity' },
            session: { admin_user_id: 1 },
            dbConnection: { /* Mock DB connection if needed */ },
            entitySchemaCollection: {
                userQueryParamsSchema: {
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
                  pageSize: {
                    type: "number",
                    minimum: 1,
                    maximum: 100,
                  },
                  page: {
                    type: "number",
                    minimum: 1,
                  },
                } 
            },
        };

        const expectedCallObject = {
            query: req.query,
            params: req.params,
            entitySchemaCollection: req.entitySchemaCollection,
            dbConnection: req.dbConnection,
        };

        const paginatedResult = {
            result: [{ id: 1, name: 'Test Product' }],
            count: 1,
        };

        crudService.getFilteredPaginated = jest.fn().mockResolvedValue(paginatedResult);

        await crudController.getFilteredPaginated(req, mockRes);

        expect(crudService.getFilteredPaginated).toHaveBeenCalledWith(expectedCallObject);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(paginatedResult);
    });
  });
  
  describe('create', () => {
    it('should call crudService.create and respond with status 201', async () => {
      const req = { body: { name: 'Test Product' }, params: { entity: 'testEntity' }, session: { admin_user_id: 1 } };
      const requestObject = { body: req.body, req, params: req.params, dbConnection: req.dbConnection, entitySchemaCollection: req.entitySchemaCollection };
      const createdProduct = { id: 1, name: 'Test Product' };

      crudService.create.mockResolvedValue([createdProduct]);

      await crudController.create(req, mockRes, mockNext);

      expect(crudService.create).toHaveBeenCalledWith(requestObject);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith([createdProduct]);
    });
  });

  describe('getById', () => {
    it('should call crudService.getById and respond with status 200', async () => {
      const req = { params: { entity: 'testEntity', id: 1 },  session: { admin_user_id: 1 }  };
      const expectedCallObject = { params: { entity: 'testEntity', id: 1 } };
      const foundProduct = { id: 1, name: 'Test Product' };

      crudService.getById.mockResolvedValue(foundProduct);

      await crudController.getById(req, mockRes, mockNext);

      expect(crudService.getById).toHaveBeenCalledWith(expectedCallObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(foundProduct);
    });

    it('should return a 200 status with null if product is not found', async () => {
      const req = { params: { entity: 'testEntity', id: 1 },  session: { admin_user_id: 1 } };
      const expectedCallObject = { params: { entity: 'testEntity', id: 1 } };

      crudService.getById.mockResolvedValue(null);

      await crudController.getById(req, mockRes, mockNext);

      expect(crudService.getById).toHaveBeenCalledWith(expectedCallObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(null);
    });
  });

  describe('getAll', () => {
    it('should call crudService.getAll and respond with status 200', async () => {
      const req = { params: { entity: 'testEntity' }, session: { admin_user_id: 1 } };
      const expectedCallObject = { params: { entity: 'testEntity' }};
      const products = [{ id: 1, name: 'Test Product 1' }, { id: 2, name: 'Test Product 2' }];

      crudService.getAll.mockResolvedValue(products);

      await crudController.getAll(req, mockRes, mockNext);

      expect(crudService.getAll).toHaveBeenCalledWith(expectedCallObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(products);
    });
  });

  describe('update', () => {
    it('should call crudService.update and respond with status 200', async () => {
      const req = {
        params: { entity: 'testEntity', id: 1 },
        body: { name: 'Updated Product' },
        session: { admin_user_id: 1 } 
      };
      const requestObject = { body: req.body, req, params: req.params, dbConnection: req.dbConnection, entitySchemaCollection: req.entitySchemaCollection };

      const updatedProduct = { id: 1, name: 'Updated Product' };

      crudService.update.mockResolvedValue(updatedProduct);

      await crudController.update(req, mockRes, mockNext);

      expect(crudService.update).toHaveBeenCalledWith(requestObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedProduct);
    });
  });

  describe('delete', () => {
    it('should call crudService.delete and respond with status 200', async () => {
      const req = { params: { entity: 'testEntity', id: 1 },  session: { admin_user_id: 1 }  };
      const expectedCallObject = { params: { entity: 'testEntity', id: 1 }};
      const deletedProduct = { id: 1, name: 'Deleted Product' };

      crudService.delete.mockResolvedValue(deletedProduct);

      await crudController.delete(req, mockRes, mockNext);

      expect(crudService.delete).toHaveBeenCalledWith(expectedCallObject);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(deletedProduct);
    });
  });
});
