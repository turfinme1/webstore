const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateQueryParams } = require("../serverConfigurations/validation");

class CrudController {
  constructor(crudService, authService) {
    this.crudService = crudService;
    this.authService = authService;
    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete= this.delete.bind(this);
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async create(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CRUD_UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "create", req.params.entity);
    const data = {
      body: req.body,
      req: req,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.create(data);
    res.status(201).json(result);

    await req.logger.info({ code: "CRUD_CREATE_SUCCESS", short_description: `Created ${data.params.entity}`, long_description: `Created ${data.params.entity} with id ${result.id}` });
  } 

  async getById(req, res, next) {
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.getById(data);
    res.status(200).json(result);
  }

  async getFilteredPaginated(req, res) {
    validateQueryParams(req, req.entitySchemaCollection[req.entitySchemaCollection[req.params.entity].queryValidationSchema]);
    const data = {
      query: req.query,
      params: req.params,
      entitySchemaCollection: req.entitySchemaCollection,
      dbConnection: req.dbConnection,
    };  
    const result = await this.crudService.getFilteredPaginated(data);
    res.status(200).json(result);
  }

  async getAll(req, res, next) {
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.getAll(data);
    res.status(200).json(result);
  }

  async update(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CRUD_UNAUTHORIZED_UPDATE", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "update", req.params.entity);
    const data = {
      body: req.body,
      req: req,
      logger: req.logger,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.update(data);
    res.status(200).json(result);

    await req.logger.info({ code: "CRUD_UPDATE_SUCCESS", short_description: `Updated ${data.params.entity}`, long_description: `Updated ${data.params.entity} with id ${data.params.id}` });
  }

  async delete(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CRUD_UNAUTHORIZED_DELETE", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "delete", req.params.entity);
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.delete(data);
    res.status(200).json(result);

    await req.logger.info({ code: "CRUD_DELETE_SUCCESS", short_description: `Deleted ${data.params.entity}`, long_description: `Deleted ${data.params.entity} with id ${data.params.id}` });
  }  
}

module.exports = CrudController;
