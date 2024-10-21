const cron = require("node-cron");
const pool = require("../database/dbConfig");
const { UserError } = require("../serverConfigurations/assert");
const { loadEntitySchemas } = require("../schemas/entitySchemaCollection");
const { clearOldFileUploads } = require("./cronJobs");

const CrudService = require("../services/crudService");
const CrudController = require("../controllers/crudController");
const ProductService = require("../services/productService");
const ProductController = require("../controllers/productController");
const AuthService = require("../services/authService");
const AuthController = require("../controllers/authController");
const OrderService = require("../services/orderService");
const OrderController = require("../controllers/orderController");
const { MailService, transporter } = require("../services/mailService");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const AppConfigService = require("../services/appConfigService");
const AppConfigController = require("../controllers/appConfigController");
const Logger = require("./logger");

const entitySchemaCollection = loadEntitySchemas("admin");
const mailService = new MailService(transporter);
const authService = new AuthService(mailService);
const authController = new AuthController(authService);
const service = new CrudService();
const controller = new CrudController(service);
const productService = new ProductService();
const productController = new ProductController(productService);
const appConfigService = new AppConfigService();
const appConfigController = new AppConfigController(appConfigService);
const orderService = new OrderService();
const orderController = new OrderController(orderService);

const routeTable = {
  get: {
    "/crud/:entity": controller.getAll,
    "/crud/:entity/filtered": controller.getFilteredPaginated,
    "/crud/:entity/:id": controller.getById,
    "/api/products" : productController.getFilteredPaginated,
    "/auth/verify-mail": authController.verifyMail,
    "/auth/status": authController.getStatus,
    "/auth/logout": authController.logout,
    "/auth/captcha": authController.getCaptcha,
    "/api/products/:id/comments": productController.getComments,
    "/api/products/:id/ratings": productController.getRatings,
    "/app-config/rate-limit-settings": appConfigController.getRateLimitSettings,
  },
  post: {
    "/crud/:entity": controller.create,
    "/api/products": productController.create,
    "/auth/register": authController.register,
    "/auth/login": authController.login,
    "/auth/forgot-password": authController.forgotPassword,
    "/auth/reset-password": authController.resetPassword,
    "/api/products/:id/comments": productController.createComment,
    "/api/products/:id/ratings": productController.createRating,
    "/api/products/:id/images": productController.uploadImages,
    "/api-back/orders": orderController.createOrderByStaff,
  },
  put: {
    "/crud/:entity/:id": controller.update,
    "/api/products/:id": productController.update,
    "/api-back/orders/:orderId": orderController.updateOrderByStaff,
    "/auth/profile": authController.updateProfile,
    "/app-config/rate-limit-settings": appConfigController.updateRateLimitSettings,
  },
  delete: {
    "/crud/:entity/:id": controller.delete,
    "/api/products/:id": productController.delete,
    "/api-back/orders/:orderId": orderController.deleteOrder,
  },
};

function registerRoutes(routing, app) {
  Object.keys(routing).forEach((method) => {
    Object.entries(routing[method]).forEach(([path, handler]) => {
      app[method.toLowerCase()](path, requestMiddleware(handler));
    });
  });
}

function requestMiddleware(handler) {
  return async (req, res, next) => {
    try {
      req.pool = pool;
      req.dbConnection = new DbConnectionWrapper(await req.pool.connect());
      req.entitySchemaCollection = entitySchemaCollection;
      req.logger = new Logger(req);
      
      req.dbConnection.query("BEGIN");
      await sessionMiddleware(req, res);
      await handler(req, res, next);
      req.dbConnection.query("COMMIT");

    } catch (error) {
      console.error(error);
      
      if (req.dbConnection) {
        req.dbConnection.query("ROLLBACK");
      }

      await req.logger.error(error);
      
      if (error instanceof UserError) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: "Internal server error" });
      }
    } finally {
      if (req.dbConnection) {
        req.dbConnection.release();
      }
    }
  };
}

async function sessionMiddleware(req, res) {
  let sessionId = req.cookies.session_id;

  if (sessionId) {
    const data = { entitySchemaCollection: req.entitySchemaCollection, dbConnection: req.dbConnection, sessionHash : sessionId };
    const session = await authService.getSession(data);

    if (session && new Date(session.expires_at) > new Date()) {
      const refreshedSession = await authService.refreshSessionExpiry(data);
      res.cookie('session_id', refreshedSession.session_hash, {
        expires: refreshedSession.expires_at,
        secure: false, httpOnly: false
      });
      req.session = session;

      return;
    }
  }

  const data = {entitySchemaCollection: req.entitySchemaCollection, dbConnection: req.dbConnection, userId: null, ipAddress: req.ip, sessionType: 'Anonymous' };
  const anonymousSession = await authService.createSession(data);
  res.cookie('session_id', anonymousSession.session_hash, {
    expires: anonymousSession.expires_at,
    secure: false, httpOnly: false
  });   

  req.session = anonymousSession;
}

cron.schedule('0 0 * * *', async () => {
  await clearOldFileUploads(pool);
});

process.on('uncaughtException', async (error) => {
  try {
    const logger =  new Logger({ dbConnection: new DbConnectionWrapper(await pool.connect()) });
    await logger.error(error);
  } catch (error) {
    console.error(error);
  }
});

process.on('unhandledRejection', async (error) => {
  try {
    const logger =  new Logger({ dbConnection: new DbConnectionWrapper(await pool.connect()) });
  await logger.error(error);
  } catch (error) {
    console.error(error);
  }
});

module.exports = { routeTable, sessionMiddleware, registerRoutes };