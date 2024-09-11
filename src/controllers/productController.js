const { validateQueryParams } = require("../serverConfigurations/validation");

class ProductController {
  constructor(productService) {
    this.productService = productService;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }
  
  async getFilteredPaginated(req, res, next) {
    validateQueryParams(req, req.entitySchemaCollection["products"]);
    const result = await this.productService.getFilteredPaginated(req);
    res.status(200).json(result);
  }
}

module.exports = ProductController;