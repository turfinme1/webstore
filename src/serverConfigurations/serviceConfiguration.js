const CrudService = require("../services/crudService");
const CrudController = require("../controllers/crudController");
const ProductService = require("../services/productService");
const ProductController = require("../controllers/productController");
const entitySchemaCollection = require("../schemas/entitySchemaCollection");
const { ASSERT_USER } = require("./assert");

const service = new CrudService(entitySchemaCollection);
const controller = new CrudController(service);
const productService = new ProductService(entitySchemaCollection);
const productController = new ProductController(productService, validateQueryParams);

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

function validateQueryParams(req, schema) {
  ASSERT_USER(schema, "Invalid query parameters");
  let searchParams = req.query.searchParams ? JSON.parse(req.query.searchParams) : {};
  let orderParams = req.query.orderParams ? JSON.parse(req.query.orderParams) : [];
  
  const invalidSearchParams = Object.keys(searchParams).filter(
    (key) => !(schema.seachParams[key])
  );
  ASSERT_USER(invalidSearchParams.length === 0, "Invalid query parameters");

  const validDirections = ["ASC", "DESC"];
  const invalidOrderParams = orderParams.filter(
    ([key, direction]) => 
      !(schema.properties[key] || schema.displayProperties[key]) || 
      !validDirections.includes(direction.toUpperCase())
  );
  ASSERT_USER(invalidOrderParams.length === 0, "Invalid order query parameters");
}


module.exports = { routeTable, validateQueryParams };