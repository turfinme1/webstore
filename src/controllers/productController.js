const STATUS_CODES = require("../serverConfigurations/constants");
const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateQueryParams } = require("../serverConfigurations/validation");

class ProductController {
  constructor(productService) {
    this.productService = productService;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.createComment = this.createComment.bind(this);
    this.createRating = this.createRating.bind(this);
    this.getComments = this.getComments.bind(this);
    this.getRatings = this.getRatings.bind(this);
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.delete = this.delete.bind(this);
  }

  async getFilteredPaginated(req, res) {
    validateQueryParams(req, req.entitySchemaCollection.productQueryParamsSchema);
    const data = {
      query: req.query,
      entitySchemaCollection: req.entitySchemaCollection,
      dbConnection: req.dbConnection,
    };  
    const result = await this.productService.getFilteredPaginated(data);
    res.status(200).json(result);
  }

  async createComment(req, res) {
    ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.productService.createComment(data);
    res.status(200).json(result);
  }

  async createRating(req, res) {
    ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      params: req.params,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.productService.createRating(data);
    res.status(200).json(result);
  }

  async getComments(req, res) {
    const data = {
      params: req.params,
      dbConnection: req.dbConnection,
    };
    const result = await this.productService.getComments(data);
    res.status(200).json(result);
  }

  async getRatings(req, res) {
    const data = {
      params: req.params,
      dbConnection: req.dbConnection,
    };
    const result = await this.productService.getRatings(data);
    res.status(200).json(result);
  }

  async create(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      req: req,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.productService.create(data);
    res.status(201).json(result);
  } 

  async update(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      req: req,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.productService.update(data);
    res.status(200).json(result);
  }

  async delete(req, res, next) {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: STATUS_CODES.UNAUTHORIZED, long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.productService.delete(data);
    res.status(200).json(result);
  } 
}

module.exports = ProductController; 