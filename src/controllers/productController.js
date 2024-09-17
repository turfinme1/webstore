const { validateQueryParams } = require("../serverConfigurations/validation");

class ProductController {
  constructor(productService, authService) {
    this.productService = productService;
    this.authService = authService;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
    this.createComment = this.createComment.bind(this);
    this.createRating = this.createRating.bind(this);
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
    await this.authService.requireAuthorization(req.session);

    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.productService.createComment(data);
    res.status(200).json(result);
  }

  async createRating(req, res) {
    await this.authService.requireAuthorization(req.session);

    const data = {
      body: req.body,
      session: req.session,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    }; 
    const result = await this.productService.createRating(data);
    res.status(200).json(result);
  }
}

module.exports = ProductController; 