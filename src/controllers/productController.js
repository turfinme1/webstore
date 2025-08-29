const { ASSERT_USER } = require("../serverConfigurations/assert");
const { validateQueryParams } = require("../serverConfigurations/validation");

class ProductController {
  constructor(productService, authService) {
    this.productService = productService;
    this.authService = authService;
  }

  getFilteredPaginated = async (req, res) => {
    validateQueryParams(req, req.entitySchemaCollection.productQueryParamsSchema);
    const data = {
      query: req.query,
      entitySchemaCollection: req.entitySchemaCollection,
      dbConnection: req.dbConnection,
    };  
    const result = await this.productService.getFilteredPaginated(data);
    res.status(200).json(result);
  }

  createComment = async (req, res) => {
    ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00032.UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" });
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

  createRating = async (req, res) => {
    ASSERT_USER(req.session.user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00045.UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" });
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

  getComments = async (req, res) => {
    const data = {
      params: req.params,
      dbConnection: req.dbConnection,
    };
    const result = await this.productService.getComments(data);
    res.status(200).json(result);
  }

  getRatings = async (req, res) => {
    const data = {
      params: req.params,
      dbConnection: req.dbConnection,
    };
    const result = await this.productService.getRatings(data);
    res.status(200).json(result);
  }

  getQuantity = async (req, res) => {
    const data = {
      params: req.params,
      dbConnection: req.dbConnection,
    };
    const result = await this.productService.getQuantity(data);
    res.status(200).json(result);
  }

  create = async (req, res) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00076.UNAUTHORIZED_CREATE", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "update", 'products');
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

  update = async (req, res) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00090.UNAUTHORIZED_UPDATE", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "update", 'products');
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

  uploadImages = async (req, res) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00104.UNAUTHORIZED_UPLAOD", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "update", 'products');
    const data = {
      body: req.body,
      req: req,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.productService.uploadImages(req);
    res.status(200).json(result);
  }

  uploadProducts = async (req, res) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00118.UNAUTHORIZED_UPLOAD", long_description: "You must be logged in to perform this action" });
    const data = {
      body: req.body,
      req: req,
      params: req.params,
      dbConnection: req.dbConnection,
      entitySchemaCollection: req.entitySchemaCollection,
    };  
    const result = await this.productService.uploadProducts(req);
    res.status(200).json(result);
  }

  delete = async (req, res) => {
    ASSERT_USER(req.session.admin_user_id, "You must be logged in to perform this action", { code: "CONTROLLER.PRODUCT.00131.UNAUTHORIZED_DELETE", long_description: "You must be logged in to perform this action" });
    this.authService.requirePermission(req, "delete", 'products');
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