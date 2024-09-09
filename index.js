const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const pool = require("./src/database/dbConfig");
const serviceConfiguration = require("./src/serverConfigurations/serviceConfiguration");
const entitySchemaCollection = require("./src/schemas/entitySchemaCollection");
const { UserError } = require("./src/serverConfigurations/assert");

const port = 3000;

app.use(express.static(path.join(__dirname, "src", "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
registerRoutes(serviceConfiguration.routeTable);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

function registerRoutes(routing) {
  Object.keys(routing).forEach((method) => {
    Object.entries(routing[method]).forEach(([path, handler]) => {
      app[method.toLowerCase()](path, requestWrapper(handler));
    });
  });
}

function requestWrapper(handler) {
  return async (req, res, next) => {
    try {
      req.pool = pool;
      req.dbConnection = await req.pool.connect();
      req.entitySchemaCollection = entitySchemaCollection;
      await handler(req, res, next);
    } catch (error) {
      console.error(error.stack);
      if (error instanceof UserError) {
        return res.status(400).json({ error: error.message });
      } else {
        return res.status(500).json({ error: error.message || "Internal server error" });
      }
    } finally {
      if (req.dbConnection) {
        req.dbConnection.release();
      }
    }
  };
}
