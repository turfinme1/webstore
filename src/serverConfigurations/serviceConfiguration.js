const CrudService = require("../services/crudService");
const CrudController = require("../controllers/crudController");
const entitySchemaCollection = require("../schemas/entitySchemaCollection");

const service = new CrudService(entitySchemaCollection);
const controller = new CrudController(service);

const routeTable = {
  get: {
    "/crud/:entity": controller.getAll,
    "/crud/:entity/:id": controller.getById,
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