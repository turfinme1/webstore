class ProductController {
  constructor(productService) {
    this.productService = productService;
    this.getFilteredPaginated = this.getFilteredPaginated.bind(this);
  }
  
  async getFilteredPaginated(req, res, next) {
    const result = await this.productService.getFilteredPaginated(req);
    res.status(200).json(result);
  }
}

module.exports = ProductController;