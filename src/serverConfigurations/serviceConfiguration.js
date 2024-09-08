const CrudService = require("../services/crudService");
const CrudController = require("../controllers/crudController");
const ProductService = require("../services/productService");
const ProductController = require("../controllers/productController");
const entitySchemaCollection = require("../schemas/entitySchemaCollection");

const service = new CrudService(entitySchemaCollection);
const controller = new CrudController(service);
const productService = new ProductService(entitySchemaCollection);
const productController = new ProductController(productService);

const routeTable = {
  get: {
    "/crud/:entity": controller.getAll,
    "/crud/:entity/:id": controller.getById,
    "/api/products" : productController.getFilteredPaginated,
  },
  post: {
    "/crud/:entity": controller.create,
  },
  put: {
    "/crud/:entity/:id": controller.update,
  },
  delete: {
    "/crud/:entity/:id": controller.delete,
  },
};

module.exports = { routeTable };