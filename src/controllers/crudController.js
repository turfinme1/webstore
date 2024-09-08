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
    const result = await this.crudService.create(req);
    res.status(201).json(result);
  }

  async getById(req, res, next) {
    const result = await this.crudService.getById(req);
    res.status(200).json(result);
  }

  async getAll(req, res, next) {
    const result = await this.crudService.getAll(req);
    res.status(200).json(result);
  }

  async update(req, res, next) {
    const result = await this.crudService.update(req);
    res.status(200).json(result);
  }

  async delete(req, res, next) {
    const result = await this.crudService.delete(req);
    res.status(200).json(result);
  }  
}

module.exports = CrudController;
