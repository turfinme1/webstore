const { validateQueryParams } = require("../serverConfigurations/validation");

class ProductController {
  constructor(productService) {
    this.productService = productService;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }

  async getFilteredPaginated(req, res, next) {
    validateQueryParams(req, req.entitySchemaCollection["products"]);
    const params = {
      query: req.query,
      entitySchemaCollection: req.entitySchemaCollection,
      dbConnection: req.dbConnection,
    };  
    const result = await this.productService.getFilteredPaginated(params);
    res.status(200).json(result);
  }
}

module.exports = ProductController;