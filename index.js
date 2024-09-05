const bodyParser = require("body-parser");
const express = require("express");
const path = require("path");
const pool = require("./src/database/dbConfig");
const CrudController = require("./src/controllers/crudController");
const entitySchemaCollection = require("./src/schemas/entitySchemaCollection");
const controller = new CrudController(entitySchemaCollection);

const app = express();
const port = 3000;

const routing = {
  get: {
    "/crud/:entity": controller.getAll,
    "/crud/:entity/:id": controller.getById,
  },
  post: {
    "/crud/:entity": controller.create,
  },
  put: {
    "/crud/:entity/:id": controller.update,
  },
  delete: {
    "/crud/:entity/:id": controller.deleteEntity,
  },
};

app.use(express.static(path.join(__dirname, "src", "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(dbConnectionMiddleware);
registerRoutes(routing);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function registerRoutes(routing) {
  Object.keys(routing).forEach((method) => {
    Object.entries(routing[method]).forEach(([path, handler]) => {
      app[method.toLowerCase()](path, asyncWrapper(handler));
    });
  });
}

function asyncWrapper(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (err) {
      console.log("error hnadler");
      next(err);
    }
  };
}

async function dbConnectionMiddleware(req, res, next) {
  let connection;
  try {
    req.pool = pool;
    connection = await req.pool.connect();
    req.dbConnection = connection;

    await next();
  } catch (err) {
    next(err);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
}
