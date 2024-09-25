class CrudController {
  constructor(crudService) {
    this.crudService = crudService;
    this.create = this.create.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
    this.update = this.update.bind(this);
    this.delete= this.delete.bind(this);
  }

  async create(req, res, next) {
    const data = {
      body: req.body,
      req: req,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.create(data);
    res.status(201).json(result);
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
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.update(data);
    res.status(200).json(result);
  }

  async delete(req, res, next) {
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.crudService.delete(data);
    res.status(200).json(result);
  }  
}

module.exports = CrudController;
