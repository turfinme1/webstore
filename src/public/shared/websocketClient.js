export const MESSAGE_TYPES = {
  EVENT: 'event',
  API_CALL: 'api_call',
}

export const HEADER_CONFIG = {
  HEADER_LENGTH: 16,
  OFFSET_REQUEST_ID: 0,
  OFFSET_SEQUENCE: 4,
  OFFSET_FLAGS: 8,
  OFFSET_RESERVED: 9,
  OFFSET_PAYLOAD_LENGTH: 12,
}

export class WebSocketMessage {
  constructor(id, type, payload, ok) {
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.ok = ok;
  }
}

export class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.nextRequestId = 1;
    this.pendingRequests = {};
    this.webSocketConnection = null;
    this.reconnectInterval = null;
    this.requestTimeout = 10000;
    this._inFlight = {};
    this.MESSAGE_DISPATCH = {
      "event": this.handleEventMessage,
    }
  }

  async init() {
    if (this.webSocketConnection) {
      console.log("WebSocket connection already established");
      return Promise.resolve();
    }

    if (!navigator.onLine) {
      if (!this.reconnectInterval) {
        this.reconnectInterval = setInterval(() => {
          if (navigator.onLine) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
            console.log("Back online—reinitializing WebSocket…");
            this.init();
          }
        }, 3000);
      }
      return Promise.reject(new Error("Offline"));
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.webSocketConnection = new WebSocket(this.url);

    this.webSocketConnection.addEventListener("message", async (event) => {
      try {
       await this.parseAndProcessMessage(event);

      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    this.webSocketConnection.addEventListener("close", () => {
      console.log("WebSocket connection closed");
      this.webSocketConnection = null;

      setTimeout(() => {
        console.log("Reconnecting...");
        this.init();
      }, 5000);
    });
    
    return new Promise((resolve, reject) => {
      this.webSocketConnection.addEventListener("open", () => {
        console.log("WebSocket connection established");
        console.log(new Date().toISOString());
        resolve();
      });

      this.webSocketConnection.addEventListener("error", (error) => {
        console.error("WebSocket error: ", error);
        reject(error);
      });

      setTimeout(() => {
        if (this.webSocketConnection?.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timed out");
          reject(new Error("WebSocket connection timed out"));
        }
      }, 5000);
    });
  }

  async sendMessage(message) {
    try {
      await this.ensureConnection();

      const messageId = this.nextRequestId++;
      const messageToSend = new WebSocketMessage(messageId, message.type, message.payload);

      return new Promise((resolve, reject) => {
        this.pendingRequests[messageId] = { resolve, reject };

        const timeoutId = setTimeout(() => {
          delete this.pendingRequests[messageId];
          reject(new WebSocketMessage(messageId, message.type, { error: "Request timed out" }, false));
        }, this.requestTimeout);

        this.pendingRequests[messageId].resolve = (response) => {
          clearTimeout(timeoutId);
          resolve(response);
        }

        this.pendingRequests[messageId].reject = (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }

        this.webSocketConnection.send(JSON.stringify(messageToSend));
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  async ensureConnection() {
    if (!this.webSocketConnection || this.webSocketConnection.readyState !== WebSocket.OPEN) {
      console.log("WebSocket not connected, initializing...");
      await this.init();
    }
    
    return Promise.resolve();
  }

  handleEventMessage = async (message) =>{
    console.log('Event message received:', message);
    const customEvent = new CustomEvent(message.payload.type, {
      detail: message.payload,
    });
    window.dispatchEvent(customEvent);
  }

  parseAndProcessMessage = async (event) => {
    const buffer = await event.data.arrayBuffer();
    const view = new DataView(buffer);

    // parse header
    const requestId = view.getUint32(HEADER_CONFIG.OFFSET_REQUEST_ID);
    const sequenceNumber = view.getUint32(HEADER_CONFIG.OFFSET_SEQUENCE);
    const flags = view.getUint8(HEADER_CONFIG.OFFSET_FLAGS);
    const isFinal = (flags & 0x1) === 1;
    const payloadLen = view.getUint32(HEADER_CONFIG.OFFSET_PAYLOAD_LENGTH);

    // slice out the payload
    const payload = new Uint8Array(buffer, HEADER_CONFIG.HEADER_LENGTH, payloadLen);

    // accumulate bytes
    let entry = this._inFlight[requestId];
    if (!entry) {
      entry = { fragments: [], fragmentsTotalCount: null };
      this._inFlight[requestId] = entry;
    }
    entry.fragments.push({ seq: sequenceNumber, chunk: payload });

    if (isFinal) {
      entry.fragmentsTotalCount = sequenceNumber;
    }

    if (entry.fragmentsTotalCount !== null && entry.fragmentsTotalCount === entry.fragments.length) {
      entry.fragments.sort((a, b) => a.seq - b.seq);
      const totalLen = entry.fragments.reduce((sum, entry) => sum + entry.chunk.byteLength, 0);
      const full = new Uint8Array(totalLen);
      let offset = 0;
      for (const { chunk } of entry.fragments) {
        full.set(chunk, offset);
        offset += chunk.byteLength;
      }

      const text = new TextDecoder().decode(full);
      console.log('Received complete message:', text);
      const message = await JSON.parse(text);

      delete this._inFlight[requestId];

      const pending = this.pendingRequests[requestId];
      delete this.pendingRequests[requestId];

      if(this.MESSAGE_DISPATCH[message.type]) {
        const messageHandler = this.MESSAGE_DISPATCH[message.type];
        await messageHandler(message);
      } else if (pending) {
          if (message.error) {
            pending.reject(message);
          } else {
            pending.resolve(message);
          }            
      }
    }
  }
}