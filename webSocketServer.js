const fs = require('fs');
const path = require("path");
const https = require("https");

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const pool = require('./src/database/dbConfig');
const Logger = require('./src/serverConfigurations/logger');
const { ENV } = require("./src/serverConfigurations/constants");
const WebSocketModule = require('./src/serverConfigurations/webSocketModule');
const { UserError, ApplicationError } = require('./src/serverConfigurations/assert');

const app = express();
const port = ENV.WEBSOCKET_PORT;
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
let webSocketServer;

(async function main() {
  const appSettings = await pool.query('SELECT * FROM app_settings WHERE id = 1');
  const appSettingsData = appSettings.rows[0];

  app.post('/message', async (req, res) => {  
    try {
      if (!req.body.payload || !req.body.type) {
        return res.status(400).json({ error: 'User ID and message are required' });
      }

      await webSocketServer.sendMessage(new WebSocketModule.WebSocketMessage(req.body.id, req.body.type, req.body.payload));
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error sending message:', error);

      if(error instanceof UserError) {
        if(error.params.code === "SERVER.WEBSOCKET.00004.NO_CONNECTIONS") {
          return res.status(404).json({ error: error.message });
        } else {
          return res.status(400).json({ error: error.message });
        }
      } else if (error instanceof ApplicationError) {
        return res.status(500).json({ error: error.message });
      } else {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  const httpServer = https.createServer({
    key: fs.readFileSync(path.join(__dirname, 'cert-key.pem'), 'utf8'),
    cert: fs.readFileSync(path.join(__dirname, 'cert.pem'), 'utf8')
  }, app);

  webSocketServer = new WebSocketModule.WebSocketServer(httpServer, '/ws/messages', appSettingsData.url, appSettingsData.front_office_port);
  webSocketServer.start();

  httpServer.listen(port, () => {
    console.log(`Websocket Server listening on port ${port}`);
  });
})();

process.on('uncaughtException', async (error) => {
  let client;
  console.error('Uncaught Exception:', error);
  try {
    client = await pool.connect();
    const logger =  new Logger({ dbConnection: client });
    await logger.error(error);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
  }
});

process.on('unhandledRejection', async (error) => {
  let client;
  console.error('Unhandled Rejection:', error);
  try {
    client = await pool.connect();
    const logger =  new Logger({ dbConnection: client });
    await logger.error(error);
  } catch (error) {
    console.error(error);
  } finally {
    if (client) {
      client.release();
    }
  }
});