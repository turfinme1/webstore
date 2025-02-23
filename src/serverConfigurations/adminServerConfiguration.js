const setTimeout = require("timers/promises").setTimeout;
const pool = require("../database/dbConfig");
const { UserError, ASSERT } = require("../serverConfigurations/assert");
const { loadEntitySchemas } = require("../schemas/entitySchemaCollection");

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
const { TemplateLoader } = require("./templateLoader");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const AppConfigService = require("../services/appConfigService");
const AppConfigController = require("../controllers/appConfigController");
const ReportService = require("../services/reportService");
const ReportController = require("../controllers/reportController");
const Logger = require("./logger");

const entitySchemaCollection = loadEntitySchemas("admin");
const templateLoader = new TemplateLoader();
const emailService = new EmailService(transporter, templateLoader);
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
const reportService = new ReportService(exportService);
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
    "/api/test-email/:id": emailController.sendTestEmail,
    "/api/preview-email/:id": emailController.previewEmail,
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
    "/api/reports/:report/export/:format": reportController.exportReport,
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
      const cancelTimeout = new AbortController();
      const cancelTask = new AbortController();
      req.signal = cancelTask.signal;
      req.pool = pool;
      req.dbConnection = new DbConnectionWrapper(await req.pool.connect(), req.pool);
      req.entitySchemaCollection = entitySchemaCollection;
      req.logger = new Logger(req);

      await req.dbConnection.query("BEGIN");
      await sessionMiddleware(req, res);

      const timeout = async () => {
        await setTimeout(60000, { signal: cancelTimeout.signal });
        cancelTask.abort();
      }
      const task = async () => {
        try {
          await handler(req, res, next);
        } finally {
          cancelTimeout.abort();
        } 
      }
      await Promise.race([timeout(), task()]);
      if(req.signal?.aborted) {
        await req.dbConnection.cancel();
        ASSERT(false, "Request aborted due to timeout", { code: "SERVER_CONFIG.ADM_SRV_CONF.00126.REQUEST_TIMEOUT", long_description: "Request aborted due to timeout", temporary: true });
      }

      await req.dbConnection.query("COMMIT");
    } catch (error) {
      console.error(error);
  
      await req.dbConnection?.query("ROLLBACK");
      await req.logger.error(error);

      if(req.signal?.aborted) {
        if(res.headersSent) {
          return res.end();
        } else {
          return res.status(500).json({ error: "Request aborted" });
        }
      } else if (error instanceof UserError) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: "Internal server error" });
      }
    } finally {
      req.dbConnection?.release();
    }
  };
}

async function sessionMiddleware(req, res) {
  const cookieName = req.entitySchemaCollection.userManagementSchema.cookie_name;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let sessionId = req.cookies[cookieName];

  const settings = await req.dbConnection.query("SELECT * FROM app_settings WHERE id = 1 LIMIT 1");
  req.context = { settings: settings.rows[0] };

  if (sessionId && UUID_REGEX.test(sessionId)) {
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