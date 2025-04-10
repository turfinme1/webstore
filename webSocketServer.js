const WebSocket = require('ws');
const { ENV } = require("./src/serverConfigurations/constants");
const { v4: uuidv4 } = require('uuid'); // Use UUID for unique chat IDs
const path = require("path");
const fs = require('fs');
const { DbConnectionWrapper } = require("./src/database/DbConnectionWrapper");
const pool = require("./src/database/dbConfig");
const { UserError, ASSERT } = require("./src/serverConfigurations/assert");
const { loadEntitySchemas } = require("./src/schemas/entitySchemaCollection");

const wss = new WebSocket.Server({ port: 5005, path: '/ws/chat' });

const activeChats = new Map(); // chatId -> { ws, username }
const staffConnections = new Set(); // All staff websockets

wss.on('connection', (ws, req) => {
    // const cookies = req.headers.cookie?.split('; ').reduce((acc, cookie) => {
    //     const [name, value] = cookie.split('=');
    //     acc[name] = decodeURIComponent(value);
    //     return acc;
    // }, {}) || {};
    
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

          const chats = Array.from(activeChats.entries()).map(([id, chat]) => ({
            chatId: id,
            username: chat.username
          }));
          staffConnections.forEach(staffWs => staffWs.send(JSON.stringify({ type: 'active_chats', chats })));
          
          const newChatMsg = JSON.stringify({ type: 'new_chat', chatId, username });
          ws.send(newChatMsg); // Send the new chat message back to the user
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