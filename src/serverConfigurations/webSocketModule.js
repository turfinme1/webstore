const WebSocket = require('ws');
const { validateObject } = require('./validation');
const { ASSERT_USER, ASSERT } = require('./assert');
const websocketSchema = require('../schemas/webSocketMessageSchema.json');
const WebSocketStream = require('./webSocketStream');
const { Readable } = require('stream');

const HIGH_WATER_MARK = 128 * 1024; // 128 KB
const THRESHOLD = 256 * 1024; // 256 KB
const MAX_PAYLOAD = 1 * 1024 * 1024; // 1 MB

const MESSAGE_TYPES = {
    EVENT: 'event',
    API_CALL: 'api_call',
    SYS: 'system',
}

const STATES = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    MESSAGE_RECEIVED: 'message-received',
    DISCONNECTED: 'disconnected',
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
        this.websocketServer = new WebSocket.Server({ server, path, maxPayload: MAX_PAYLOAD });
        this.sessionConnections = {};
        this.userConnections = {};
        this.MESSAGE_DISPATCH = {
            "api_call": this.handleApiCallMessage,
        };
        this.machine = {
            transitions: {
                [STATES.CONNECTING] : {
                    [STATES.CONNECTED]: this.handleConnected,
                    [STATES.DISCONNECTED]: this.handleDisconnected,
                    [STATES.MESSAGE_RECEIVED]: this.handleMessageReceived,
                },
                [STATES.CONNECTED]: {
                    [STATES.DISCONNECTED]: this.handleDisconnected,
                    [STATES.MESSAGE_RECEIVED]: this.handleMessageReceived,
                },
                [STATES.MESSAGE_RECEIVED]: {
                    [STATES.DISCONNECTED]: this.handleDisconnected,
                    [STATES.CONNECTED]: this.handleConnected,
                    [STATES.MESSAGE_RECEIVED]: this.handleMessageReceived,
                },
            },

            async changeState(currentState, newState, context, additionalData) {
                ASSERT(this.transitions[currentState][newState], `Invalid transition from ${currentState} to ${newState}`, { 
                    code: "SERVER.WEBSOCKET.00005.INVALID_TRANSITION", 
                    long_description: `Invalid transition from ${currentState} to ${newState}` 
                });

                const func = this.transitions[currentState][newState];
                const result = await func(context, additionalData);
                if(result === true) {
                    context.state = newState;
                }
            }
        }
    }

    start = async () => {
        this.websocketServer.on('connection', async (ws, req) => {
            let context = {
                ws,
                req,
                userId: null,
                sessionId: null,
                state: STATES.CONNECTING,
            }

            ws.on('message', async (messageRaw) => {
                await this.machine.changeState(context.state, STATES.MESSAGE_RECEIVED, context, messageRaw);
                await this.machine.changeState(context.state, STATES.CONNECTED, context);
            });

            await this.machine.changeState(context.state, STATES.CONNECTED, context);
            
            ws.on('close', async () => {
                await this.machine.changeState(context.state, STATES.DISCONNECTED, context);
            });
        });
    }

    handleConnected = async (context) => {
        try {
            if (this.sessionConnections[context.sessionId] && this.sessionConnections[context.sessionId].has(context.ws)) { 
                return true; // Already connected
            }

            console.log('New connection from:', context.req.socket.remoteAddress);
            const cookie = this.parseCookies(context.req.headers.cookie);
            context.sessionId = cookie.session_id;
            
            if ( ! context.sessionId) {
                context.ws.close(4001, "Session ID required");
                return;
            }
            
            if( ! this.sessionConnections[context.sessionId]) {
                this.sessionConnections[context.sessionId] = new Set();
            }
            this.sessionConnections[context.sessionId].add(context.ws);

            const baseUrl = new URL(this.apiUrl);
            baseUrl.port = this.apiPort;
            const apiUrl = new URL(`/auth/session/user`, baseUrl);
            const userIdRequest = await fetch(apiUrl.toString(), {
                headers: {
                    "Cookie": `session_id=${context.sessionId}`,
                }
            });

            if(userIdRequest.ok) {
                context.userId = await userIdRequest.json();
                if(context.userId) {
                    if( ! this.userConnections[context.userId]) {
                        this.userConnections[context.userId] = new Set();
                    }
                    this.userConnections[context.userId].add(context.ws);
                }
            }

            console.log(`User ${context.sessionId} connected to notification system`);
        } catch (error) {
            console.log('Error during WebSocket connection:', error);
            context.ws.close(1011, "Server error");
        }

        return true;
    }

    handleDisconnected = async (context) =>  {
        if (this.sessionConnections[context.sessionId]) {
            this.sessionConnections[context.sessionId].delete(context.ws);
            if (this.sessionConnections[context.sessionId].size === 0) {
                delete this.sessionConnections[context.sessionId];
            }
            console.log(`User ${context.sessionId} disconnected from notification system`);
        }

        if (this.userConnections[context.userId]) {
            this.userConnections[context.userId].delete(context.ws);
            if (this.userConnections[context.userId].size === 0) {
                delete this.userConnections[context.userId];
            }
            console.log(`User ${context.userId} disconnected from notification system`);
        }

        return true;
    }

    handleMessageReceived = async (context, messageRaw) => {
        try {
            const message = JSON.parse(messageRaw);
            validateObject(message, websocketSchema);
            console.log(`Received message from user ${context.sessionId}:`, message);

            if(this.MESSAGE_DISPATCH[message.type]) {
                const messageHandler = this.MESSAGE_DISPATCH[message.type];
                await messageHandler(message, context);
            }
        } catch (error) {
            console.error('Error processing message:', error);
            const errorPayload = {
                code: error.params?.code || "SERVER.WEBSOCKET.00001.UNKNOWN_ERROR",
                error: error.params?.long_description || error.message || "Internal server error",
            };
            context.ws.send(JSON.stringify(new WebSocketMessage(null, MESSAGE_TYPES.SYS, errorPayload, false)));
        }

        return true;
    }

    sendMessage = async (data) =>{
        ASSERT_USER(data.type, " Type is required", { code: "SERVER.WEBSOCKET.00002.TYPE_REQUIRED", long_description: "Type is required" });
        ASSERT_USER(data.payload, " Payload is required", { code: "SERVER.WEBSOCKET.00003.PAYLOAD_REQUIRED", long_description: "Payload is required" });
        
        if( ! data.payload.user_id) {
            for (const sessionId in this.sessionConnections) {
                const sessionSockets = this.sessionConnections[sessionId];
                for (const sessionConnection of sessionSockets) {
                    await this.sendStreamedJson(sessionConnection, data?.id, new WebSocketMessage(data?.id, data.type, data.payload, true));
                }
            }
            return;
        }

        const userSockets = this.userConnections[data.payload.user_id];
        
        ASSERT_USER(userSockets?.size > 0, "No user connections found", { code: "SERVER.WEBSOCKET.00004.NO_CONNECTIONS", long_description: "No user connections found" });

        for (const userConnection of userSockets) {
            await this.sendStreamedJson(userConnection, data?.id, new WebSocketMessage(data?.id, data.type, data.payload, true));
        }
    }

    handleApiCallMessage = async (message, context) => {
        try {
            message.payload.options = {
                ...message.payload?.options,
                headers: {
                    ...message.payload.options?.headers,
                    "Cookie": `session_id=${context.sessionId}`,
                }
            };

            const baseUrl = new URL(this.apiUrl);
            baseUrl.port = this.apiPort;
            const apiUrl = new URL(message.payload.url, baseUrl);

            const apiResponse = await fetch(apiUrl.toString(), message.payload.options);
            
            if (apiResponse.status === 204) {
                await this.sendStreamedJson(context.ws, message.id, new WebSocketMessage(message.id, MESSAGE_TYPES.API_CALL, null, true));
                return;
            }

            const responseBodyReadableStream = Readable.fromWeb(apiResponse.body);
            const webSocketStream = new WebSocketStream(context.ws, {  
                highWaterMark: HIGH_WATER_MARK,
                threshold: THRESHOLD,
                requestId: message.id, 
            });
            responseBodyReadableStream.pipe(webSocketStream);
        } catch (error) {
            console.error('Error processing API call:', error);
            await this.sendStreamedJson(context.ws, message.id, new WebSocketMessage(message.id, MESSAGE_TYPES.API_CALL, null, false)); 
        }
    }

    sendStreamedJson = async (ws, requestId, payload) => {
        const jsonString = JSON.stringify(payload);
        const buffer = Buffer.from(jsonString, 'utf8');
        const readableStream = new Readable({
            read() {
                this.push(buffer);
                this.push(null);
            }
        });

        const webSocketStream = new WebSocketStream(ws, {
            highWaterMark: HIGH_WATER_MARK,
            threshold: THRESHOLD,
            requestId: requestId,
        });
        readableStream.pipe(webSocketStream);
    }

    parseCookies = (cookieHeader = '') => {
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
    WebSocketServer,
};