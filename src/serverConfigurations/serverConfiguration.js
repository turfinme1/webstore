if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

const pool = require("../database/dbConfig");
const { UserError } = require("../serverConfigurations/assert");
const { loadEntitySchemas } = require("../schemas/entitySchemaCollection");

const { ENV } = require("./constants");
const CrudService = require("../services/crudService");
const CrudController = require("../controllers/crudController");
const ProductService = require("../services/productService");
const ProductController = require("../controllers/productController");
const AuthService = require("../services/authService");
const AuthController = require("../controllers/authController");
const CartController = require("../controllers/cartController");
const CartService = require("../services/cartService");
const OrderService = require("../services/orderService");
const OrderController = require("../controllers/orderController");
const AppConfigService = require("../services/appConfigService");
const AppConfigController = require("../controllers/appConfigController");
const { MessageService, transporter } = require("../services/messageService");
const { TemplateLoader } = require("./templateLoader");
const { DbConnectionWrapper } = require("../database/DbConnectionWrapper");
const NotificationService = require("../services/notificationService");
const NotificationController = require("../controllers/notificationController");
const Logger = require("./logger");
const paypalClientWrapper = require("./paypalClient");

const paypalClient = new paypalClientWrapper.core.PayPalHttpClient(ENV.PAYPAL_CLIENT_ID, ENV.PAYPAL_CLIENT_SECRET);
const entitySchemaCollection = loadEntitySchemas("user");
const templateLoader = new TemplateLoader();
const messageService = new MessageService(transporter, templateLoader);
const cartService = new CartService();
const cartController = new CartController(cartService);
const authService = new AuthService(messageService, cartService);
const authController = new AuthController(authService);
const notificationService = new NotificationService();
const notificationController = new NotificationController(notificationService);
const service = new CrudService();
const controller = new CrudController(service);
const productService = new ProductService();
const productController = new ProductController(productService);
const orderService = new OrderService(messageService, paypalClient, cartService);
const orderController = new OrderController(orderService);
const appConfigService = new AppConfigService();
const appConfigController = new AppConfigController(appConfigService, authService);

const routeTable = {
  get: {
    "/crud/:entity": controller.getAll,
    "/crud/:entity/:id": controller.getById,
    "/api/products" : productController.getFilteredPaginated,
    "/auth/verify-mail": authController.verifyMail,
    "/auth/status": authController.getStatus,
    "/auth/logout": authController.logout,
    "/auth/captcha": authController.getCaptcha,
    "/auth/session/user": authController.getUserIdBySession,
    "/api/products/:id/comments": productController.getComments,
    "/api/products/:id/ratings": productController.getRatings,
    "/api/products/:id/quantity": productController.getQuantity,
    "/api/cart": cartController.getCart,
    "/api/cart/active-vouchers": cartController.getActiveVouchers,
    "/api/orders/:orderId": orderController.getOrder,
    "/api/paypal/capture/:orderId": orderController.capturePaypalPayment,
    "/api/paypal/cancel/:orderId": orderController.cancelPaypalPayment,
    "/api/notifications": notificationController.getNotificationByUserId,
    "/api/front-office-transport": appConfigController.getFrontOfficeTransportConfig,
    "/api/cart/validate-stock": cartController.validateStockForItems,
  },
  post: {
    "/auth/register": authController.register,
    "/auth/login": authController.login,
    "/auth/forgot-password": authController.forgotPassword,
    "/auth/reset-password": authController.resetPassword,
    "/api/products/:id/comments": productController.createComment,
    "/api/products/:id/ratings": productController.createRating,
    "/api/cart": cartController.updateItem,
    "/api/cart/apply-voucher": cartController.applyVoucher,
    "/api/cart/remove-voucher": cartController.removeVoucher,
    "/api/orders": orderController.createOrder,
    "/api/subscriptions": notificationController.createSubscription,
  },
  put: {
    "/auth/profile": authController.updateProfile,
    "/api/notifications/:id": notificationController.updateNotificationStatus,
  },
  delete: {
    "/api/cart/:itemId": cartController.deleteItem,
    "/api/subscriptions": notificationController.deleteSubscription,
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

      if(!(error instanceof UserError)) {
        await req.logger.createIssue(error, req);
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