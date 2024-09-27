const pool = require("../database/dbConfig");
const { UserError } = require("../serverConfigurations/assert");
const { loadEntitySchemas } = require("../schemas/entitySchemaCollection");

const CrudService = require("../services/crudService");
const CrudController = require("../controllers/crudController");
const ProductService = require("../services/productService");
const ProductController = require("../controllers/productController");
const AuthService = require("../services/authService");
const AuthController = require("../controllers/authController");
const { MailService, transporter } = require("../services/mailService");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const AppConfigService = require("../services/appConfigService");
const AppConfigController = require("../controllers/appConfigController");

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

const routeTable = {
  get: {
    "/crud/:entity": controller.getAll,
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
    "/auth/register": authController.register,
    "/auth/login": authController.login,
    "/auth/forgot-password": authController.forgotPassword,
    "/auth/reset-password": authController.resetPassword,
    "/api/products/:id/comments": productController.createComment,
    "/api/products/:id/ratings": productController.createRating,
  },
  put: {
    "/crud/:entity/:id": controller.update,
    "/auth/profile": authController.updateProfile,
    "/app-config/rate-limit-settings": appConfigController.updateRateLimitSettings,
  },
  delete: {
    "/crud/:entity/:id": controller.delete,
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

      req.dbConnection.query("BEGIN");
      await sessionMiddleware(req, res);
      await handler(req, res, next);
      req.dbConnection.query("COMMIT");

    } catch (error) {
      console.error(error);

      if (req.dbConnection) {
        req.dbConnection.query("ROLLBACK");
      }
      
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
        secure: true,
        httpOnly: true
      });
      req.session = session;

      return;
    }
  }

  const data = {entitySchemaCollection: req.entitySchemaCollection, dbConnection: req.dbConnection, userId: null, ipAddress: req.ip, sessionType: 'Anonymous' };
  const anonymousSession = await authService.createSession(data);
  res.cookie('session_id', anonymousSession.session_hash, {
    expires: anonymousSession.expires_at,
    secure: true,
    httpOnly: true
  });

  req.session = anonymousSession;
}

module.exports = { routeTable, sessionMiddleware, registerRoutes };