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
const ExportService = require("../services/exportService");
const ExportController = require("../controllers/exportController");
const { EmailService, transporter } = require("../services/emailService");
const EmailController = require("../controllers/emailController");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const AppConfigService = require("../services/appConfigService");
const AppConfigController = require("../controllers/appConfigController");
const ReportService = require("../services/reportService");
const ReportController = require("../controllers/reportController");
const Logger = require("./logger");

const entitySchemaCollection = loadEntitySchemas("admin");
const emailService = new EmailService(transporter);
const emailController = new EmailController(emailService);
const authService = new AuthService(emailService);
const authController = new AuthController(authService);
const crudService = new CrudService();
const crudController = new CrudController(crudService, authService);
const productService = new ProductService();
const productController = new ProductController(productService, authService);
const appConfigService = new AppConfigService();
const appConfigController = new AppConfigController(appConfigService, authService);
const orderService = new OrderService(emailService);
const orderController = new OrderController(orderService, authService);
const exportService = new ExportService(crudService);
const exportController = new ExportController(exportService);
const reportService = new ReportService();
const reportController = new ReportController(reportService);

const routeTable = {
  get: {
    "/crud/:entity": crudController.getAll,
    "/crud/:entity/filtered": crudController.getFilteredPaginated,
    "/api/:entity/filtered/export/csv": exportController.exportToCsv,
    "/api/:entity/filtered/export/excel": exportController.exportToExcel,
    "/crud/:entity/:id": crudController.getById,
    "/api/products" : productController.getFilteredPaginated,
    "/auth/verify-mail": authController.verifyMail,
    "/auth/status": authController.getStatus,
    "/auth/logout": authController.logout,
    "/auth/captcha": authController.getCaptcha,
    "/api/products/:id/comments": productController.getComments,
    "/api/products/:id/ratings": productController.getRatings,
    "/app-config/rate-limit-settings": appConfigController.getRateLimitSettings,
    "/api/test-email/:type": emailController.sendTestEmail,
    "/api/preview-email/:type": emailController.previewEmail,
  },
  post: {
    "/crud/:entity": crudController.create,
    "/api/products": productController.create,
    "/auth/register": authController.register,
    "/auth/login": authController.login,
    "/auth/forgot-password": authController.forgotPassword,
    "/auth/reset-password": authController.resetPassword,
    "/api/products/:id/comments": productController.createComment,
    "/api/products/:id/ratings": productController.createRating,
    "/api/products/:id/images": productController.uploadImages,
    "/api-back/orders": orderController.createOrderByStaff,
    '/api/products/upload': productController.uploadProducts,
    "/api/reports/:report": reportController.getReport,
  },
  put: {
    "/crud/:entity/:id": crudController.update,
    "/api/products/:id": productController.update,
    "/api-back/orders/:orderId": orderController.updateOrderByStaff,
    "/auth/profile": authController.updateProfile,
    "/app-config/rate-limit-settings": appConfigController.updateRateLimitSettings,
  },
  delete: {
    "/crud/:entity/:id": crudController.delete,
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
  const cookieName = req.entitySchemaCollection.userManagementSchema.cookie_name;
  let sessionId = req.cookies[cookieName];

  if (sessionId) {
    const data = { entitySchemaCollection: req.entitySchemaCollection, dbConnection: req.dbConnection, sessionHash : sessionId };
    const session = await authService.getSession(data);

    if (session && new Date(session.expires_at) > new Date()) {
      const refreshedSession = await authService.refreshSessionExpiry(data);
      res.cookie(cookieName, refreshedSession.session_hash, {
        expires: refreshedSession.expires_at,
        secure: false, httpOnly: false
      });

      const rolesPermissions = await req.dbConnection.query(`
        SELECT roles.name as role, permissions.name as permission, interfaces.name as interface
        FROM role_permissions
        JOIN permissions ON role_permissions.permission_id = permissions.id
        JOIN interfaces ON permissions.interface_id = interfaces.id
        JOIN roles ON role_permissions.role_id = roles.id
        WHERE roles.id IN (SELECT role_id FROM admin_user_roles WHERE admin_user_id = $1) AND roles.is_active = true`,
        [session.admin_user_id]
      );
      session.role_permissions = rolesPermissions.rows;
      req.session = session;
      return;
    }
  }

  const data = {entitySchemaCollection: req.entitySchemaCollection, dbConnection: req.dbConnection, userId: null, ipAddress: req.ip, sessionType: 'Anonymous' };
  const anonymousSession = await authService.createSession(data);
  res.cookie(cookieName, anonymousSession.session_hash, {
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