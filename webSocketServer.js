const fs = require('fs');
const path = require("path");
const https = require("https");
const WebSocket = require('ws');

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const pool = require('./src/database/dbConfig');
const Logger = require('./src/serverConfigurations/logger');
const { ENV } = require("./src/serverConfigurations/constants");
const { DbConnectionWrapper } = require('./src/database/DbConnectionWrapper');

const userConnections = new Map();
const app = express();
const port = ENV.WEBSOCKET_PORT;
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/message', async (req, res) => {
  try {
    if (!req.body.user_id || !req.body.payload || !req.body.type) {
      return res.status(400).json({ error: 'User ID and message are required' });
    }

    const userSockets = userConnections.get(req.body.user_id);
    if (userSockets?.size > 0) {
      for (const userConnection of userSockets) {
        userConnection.send(JSON.stringify({ type: req.body.type, payload: req.body.payload }));
      }
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'User not connected' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const server = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'cert-key.pem'), 'utf8'),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'), 'utf8')
}, app);

const wss = new WebSocket.Server({
  server: server,
  path: '/ws/messages'
});

wss.on('connection', async (ws, req) => {
  let userId;
  let logger;
  let client;
  
  try {
    client = await pool.connect();
    console.log('New notification connection from:', req.socket.remoteAddress);
    
    const url = new URL(req.url, `https://${req.headers.host}`);
    const sessionHash = url.searchParams.get('session_id');
    
    if (!sessionHash) {
      ws.close(4001, "Authentication required");
      return;
    }
  
    const sessionResult = await client.query(`
      SELECT * FROM sessions WHERE session_hash = $1 AND is_active = TRUE
    `, [sessionHash]);
    
    if (sessionResult.rows.length === 0) {
      ws.close(4003, "Invalid session");
      return;
    }
    
    const session = sessionResult.rows[0];
    userId = session.user_id;
    
    if (!userId) {
      ws.close(4002, "User ID not found in session");
      return;
    }
    
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(ws);
    
    console.log(`User ${userId} connected to notification system`);
    
    ws.on('close', () => {
      if (userId && userConnections.has(userId)) {
        userConnections.get(userId).delete(ws);
        if (userConnections.get(userId).size === 0) {
          userConnections.delete(userId);
        }
        console.log(`User ${userId} disconnected from notification system`);
      }
    });
    
  } catch (error) {
    console.log('Error during WebSocket connection:', error);
    
    if(client) {
      await client.query("ROLLBACK");
      logger = new Logger({ dbConnection: new DbConnectionWrapper(client) });
      await logger.error(error);
    }

    ws.close(1011, "Server error");
  } finally {
    if (client) {
      client.release();
    }
  }
});

server.listen(port, () => {
  console.log(`Websocket Server listening on port ${port}`);
});

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