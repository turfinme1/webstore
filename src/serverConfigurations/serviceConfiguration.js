const ProductService = require("../services/productService");
const ProductController = require("../controllers/productController");

const productService = new ProductService();
const productController = new ProductController(productService);

const routeTable = {
  get: {
    "/api/products" : productController.getFilteredPaginated,
  },
};

module.exports = { routeTable };