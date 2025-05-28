export const MESSAGE_TYPES = {
  EVENT: 'event',
  API_CALL: 'api_call',
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
    this.MESSAGE_DISPATCH = {
      "event": this.handleEventMessage,
      "api_call": this.handleApiCallMessage,
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
        const message = JSON.parse(event.data);

        if(this.MESSAGE_DISPATCH[message.type]) {
          const messageHandler = this.MESSAGE_DISPATCH[message.type];
          await messageHandler(message);
        }
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

  handleApiCallMessage = async (message) => {
    console.log('API call message received:', message);
    const requestEntry = this.pendingRequests[message.id];

    if(!requestEntry) {
      return;
    }

    delete this.pendingRequests[message.id];

    if (message.ok) {
      requestEntry.resolve(message);
    } else {
      requestEntry.reject(message);
    }
  }
}