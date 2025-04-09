const { v4: uuidv4 } = require('uuid'); // Use UUID for unique chat IDs
const { DbConnectionWrapper } = require("./src/database/DbConnectionWrapper");
const pool = require("./src/database/dbConfig");
const { UserError, ASSERT } = require("./src/serverConfigurations/assert");
const { loadEntitySchemas } = require("./src/schemas/entitySchemaCollection");

const WebSocket = require('ws');
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

const wss = new WebSocket.Server({
    server: server,
    path: '/ws/chat'
  });

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
}); 


const activeChats = new Map(); // chatId -> { ws, username }
const staffConnections = new Set(); // All staff websockets

wss.on('connection', (ws, req) => {
    /// parse cookies
    const cookies = req.headers.cookie?.split('; ').reduce((acc, cookie) => {
        const [name, value] = cookie.split('=');
        acc[name] = decodeURIComponent(value);
        return acc;
    }, {}) || {};
    
  let role = null;
  let chatId = null; // for regular users
  console.log('New chat connection established from:', req.socket.remoteAddress);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Handle initialization message to identify role and username
      if (data.type === 'init') {
        role = data.role;
        const username = data.username;
        if (role === 'staff') {
          staffConnections.add(ws);
          console.log(`Staff user connected: ${username}`);
          // Optionally: send the list of active chats to the staff user
          const chats = Array.from(activeChats.entries()).map(([id, chat]) => ({
            chatId: id,
            username: chat.username
          }));
          ws.send(JSON.stringify({ type: 'active_chats', chats }));
        } else if (role === 'user') {
          // Create a new chat session for the user and store connection
          chatId = uuidv4();
          activeChats.set(chatId, { ws, username });
          console.log(`User connected: ${username} with chatId ${chatId}`);
          // Notify all staff users of the new chat
          const newChatMsg = JSON.stringify({ type: 'new_chat', chatId, username });
          staffConnections.forEach(staffWs => staffWs.send(newChatMsg));
        }
      } else if (data.type === 'message') {
        // Forward message according to sender's role
        // Both staff and regular users send messages including chatId
        const msgToSend = JSON.stringify(data);
        if (role === 'user') {
          // Forward to all staff users
          staffConnections.forEach(staffWs => staffWs.send(msgToSend));
        } else if (role === 'staff') {
          // Forward to the specific user's connection based on chatId
          const targetChat = activeChats.get(data.chatId);
          if (targetChat && targetChat.ws && targetChat.ws.readyState === WebSocket.OPEN) {
            targetChat.ws.send(msgToSend);
          }
        }
      } else if (data.type === 'close_chat') {
        // Allow either party to end a chat session
        if (role === 'user' && chatId) {
          activeChats.delete(chatId);
          // Inform staff that this chat is closed
          const closeMsg = JSON.stringify({ type: 'chat_closed', chatId });
          staffConnections.forEach(staffWs => staffWs.send(closeMsg));
        }
      }
    } catch (error) {
      console.error('Error parsing JSON message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON format' }));
    }
  });

  ws.on('close', () => {
    // Cleanup on disconnect
    if (role === 'staff') {
      staffConnections.delete(ws);
    } else if (role === 'user' && chatId) {
      activeChats.delete(chatId);
      // Inform staff users that chat is closed
      const closeMsg = JSON.stringify({ type: 'chat_closed', chatId });
      staffConnections.forEach(staffWs => staffWs.send(closeMsg));
    }
  });
});

console.log('WebSocket chat server is running on ws://localhost:8080');