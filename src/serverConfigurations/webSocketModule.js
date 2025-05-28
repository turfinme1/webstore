const WebSocket = require('ws');
const { validateObject } = require('./validation');
const { ASSERT_USER, ASSERT } = require('./assert');
const websocketSchema = require('../schemas/webSocketMessageSchema.json');

const MESSAGE_TYPES = {
    EVENT: 'event',
    API_CALL: 'api_call',
    SYS: 'system',
}

class WebSocketMessage {
     constructor(id, type, payload, ok) {
        this.id = id;
        this.type = type;
        this.ok = ok;
        this.payload = payload;
    }
}

class WebSocketServer {
    constructor(server, path, apiUrl, apiPort) {
        this.server = server;
        this.path = path;
        this.apiUrl = apiUrl;
        this.apiPort = apiPort;
        this.websocketServer = new WebSocket.Server({ server, path });
        this.sessionConnections = {};
        this.userConnections = {};
        this.MESSAGE_DISPATCH = {
            "api_call": this.handleApiCallMessage,
        };
    }

    async start() {
        this.websocketServer.on('connection', async (ws, req) => {
            let sessionId;
            let userId;

            ws.on('message', async (messageRaw) => {
                try {
                    const message = JSON.parse(messageRaw);
                    validateObject(message, websocketSchema);

                    console.log(`Received message from user ${sessionId}:`, message);

                    if(this.MESSAGE_DISPATCH[message.type]) {
                        const messageHandler = this.MESSAGE_DISPATCH[message.type];
                        const response = await messageHandler(message, sessionId);
                        return ws.send(JSON.stringify(response));
                    }
                    
                } catch (error) {
                    console.error('Error processing message:', error);
                    const errorPayload = {
                        code: error.params?.code || "SERVER.WEBSOCKET.00001.UNKNOWN_ERROR",
                        error: error.params?.long_description || error.message || "Internal server error",
                    };
                    ws.send(JSON.stringify(new WebSocketMessage(null, MESSAGE_TYPES.SYS, errorPayload, false)));
                }
            });

            try {
                console.log('New connection from:', req.socket.remoteAddress);
                const cookie = this.parseCookies(req.headers.cookie);
                sessionId = cookie.session_id;
                
                if ( ! sessionId) {
                    ws.close(4001, "Session ID required");
                    return;
                }
                
                if( ! this.sessionConnections[sessionId]) {
                    this.sessionConnections[sessionId] = new Set();
                }
                this.sessionConnections[sessionId].add(ws);

                const baseUrl = new URL(this.apiUrl);
                baseUrl.port = this.apiPort;
                const apiUrl = new URL(`/auth/session/user`, baseUrl);
                const userIdRequest = await fetch(apiUrl.toString(), {
                    headers: {
                        "Cookie": `session_id=${sessionId}`,
                    }
                });

                if(userIdRequest.ok) {
                    userId = await userIdRequest.json();
                    if(userId) {
                        if( ! this.userConnections[userId]) {
                            this.userConnections[userId] = new Set();
                        }
                        this.userConnections[userId].add(ws);
                    }
                }

                console.log(`User ${sessionId} connected to notification system`);
            } catch (error) {
                console.log('Error during WebSocket connection:', error);

                ws.close(1011, "Server error");
            }
            
            ws.on('close', () => {
                if (this.sessionConnections[sessionId]) {
                    this.sessionConnections[sessionId].delete(ws);
                    if (this.sessionConnections[sessionId].size === 0) {
                        delete this.sessionConnections[sessionId];
                    }
                    console.log(`User ${sessionId} disconnected from notification system`);
                }

                if (this.userConnections[userId]) {
                    this.userConnections[userId].delete(ws);
                    if (this.userConnections[userId].size === 0) {
                        delete this.userConnections[userId];
                    }
                    console.log(`User ${userId} disconnected from notification system`);
                }
            });
        });
    }

    async sendMessage(data) {
        ASSERT_USER(data.type, " Type is required", { code: "SERVER.WEBSOCKET.00002.TYPE_REQUIRED", long_description: "Type is required" });
        ASSERT_USER(data.payload, " Payload is required", { code: "SERVER.WEBSOCKET.00003.PAYLOAD_REQUIRED", long_description: "Payload is required" });
        
        if( ! data.payload.user_id) {
            for (const sessionId in this.sessionConnections) {
                const sessionSockets = this.sessionConnections[sessionId];
                for (const sessionConnection of sessionSockets) {
                    sessionConnection.send(JSON.stringify(new WebSocketMessage(data?.id, data.type, data.payload, true)));
                }
            }
            return;
        }

        const userSockets = this.userConnections[data.payload.user_id];
        
        ASSERT_USER(userSockets?.size > 0, "No user connections found", { code: "SERVER.WEBSOCKET.00004.NO_CONNECTIONS", long_description: "No user connections found" });

        for (const userConnection of userSockets) {
            userConnection.send(JSON.stringify(new WebSocketMessage(data?.id, data.type, data.payload, true)));
        }
    }

    handleApiCallMessage = async (message, sessionId) => {
        try {
            message.payload.options = {
                ...message.payload?.options,
                headers: {
                    ...message.payload.options?.headers,
                    "Cookie": `session_id=${sessionId}`,
                }
            };

            const baseUrl = new URL(this.apiUrl);
            baseUrl.port = this.apiPort;
            const apiUrl = new URL(message.payload.url, baseUrl);

            const apiResponse = await fetch(apiUrl.toString(), message.payload.options);
            let data = null;
            if(apiResponse.status !== 204){
                data = await apiResponse.json();
            }
            return new WebSocketMessage(message.id, MESSAGE_TYPES.API_CALL, data, apiResponse.ok === true);
        } catch (error) {
            console.error('Error processing API call:', error);
            return new WebSocketMessage(message.id, MESSAGE_TYPES.API_CALL, null, false);
        }
    }

    parseCookies(cookieHeader = '') {
        return cookieHeader
            .split(';')
            .map(cookie => cookie.trim())
            .reduce((out, cookie) => {
                const [name, ...rest] = cookie.split('=');
                out[name] = decodeURIComponent(rest.join('='));
                return out;
            }, {});
    }
}

module.exports = {
    MESSAGE_TYPES,
    WebSocketMessage,
    WebSocketServer
};