class ProductController {
  constructor(productService, validateQueryParams) {
    this.productService = productService;
    this.validateQueryParams = validateQueryParams;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }
  
  async getFilteredPaginated(req, res, next) {
    this.validateQueryParams(req, req.entitySchemaCollection["products"]);
    const result = await this.productService.getFilteredPaginated(req);
    res.status(200).json(result);
  }
}

module.exports = ProductController;