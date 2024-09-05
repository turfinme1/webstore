const path = require("path");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const pool = require("./src/database/dbConfig");
const serviceConfiguration = require("./src/serverConfigurations/serviceConfiguration");

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
      await handler(req, res, next);
    } catch (err) {
      console.error(err.stack);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      if (req.dbConnection) {
        req.dbConnection.release();
      }
    }
  };
}