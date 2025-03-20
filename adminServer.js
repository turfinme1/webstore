const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const https = require("https");
const fs = require('fs');
const { ENV } = require("./src/serverConfigurations/constants");

const serverConfig = require("./src/serverConfigurations/adminServerConfiguration");

const port = ENV.BACKOFFICE_PORT;
const app = express();
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..")));
app.use(express.static(path.join(__dirname, "src", "public", "admin"), { index:false, extensions:['html'] }));
app.use(express.static(path.join(__dirname, "src", "public", "shared"), { index:false, extensions:['html'] }));
app.use(express.static(path.join(__dirname, "src", "schemas")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

serverConfig.registerRoutes(serverConfig.routeTable, app);

const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'cert-key.pem'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'), 'utf8')
}, app);

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});