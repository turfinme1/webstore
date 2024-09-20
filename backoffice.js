const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const serverConfig = require("./src/serverConfigurations/serverConfiguration");

const port = 4000;
const app = express();
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..")));
app.use(express.static(path.join(__dirname, "src", "public", "admin"),{index:false,extensions:['html']}));
app.use(express.static(path.join(__dirname, "src", "public", "shared"),{index:false,extensions:['html']}));
app.use(express.static(path.join(__dirname, "src", "schemas")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

serverConfig.registerRoutes(serverConfig.routeTable, app);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});