const bodyParser = require("body-parser");
const express = require("express");
const path = require("path");
const pool = require("./src/database/dbConfig");
const CrudController = require("./src/controllers/crudController");
const entitySchemaCollection = require("./src/schemas/entitySchemaCollection");

const app = express();
const port = 3000;
const controller = new CrudController(entitySchemaCollection);

app.use(express.static(path.join(__dirname, "src", "public")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(dbConnectionMiddleware);
app.get("/crud/:entity", controller.getAll);
app.get("/crud/:entity/:id", controller.getById);
app.post("/crud/:entity", controller.create);
app.put("/crud/:entity/:id", controller.update);
app.delete("/crud/:entity/:id", controller.deleteEntity);

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

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