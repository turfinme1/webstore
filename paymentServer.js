const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const serverConfig = require("./src/serverConfigurations/paymentServerConfiguration");

const port = 5002;
const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

serverConfig.registerRoutes(serverConfig.routeTable, app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});