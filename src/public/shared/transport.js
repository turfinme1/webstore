import { MESSAGE_TYPES } from "./websocketClient.js";

export class HttpTransport {
    async fetch(url, options) {
        const response = await fetch(url, options);
        const data = await response.json();
        return { payload: data, ok: response.ok };
    }
}

export class WebSocketTransport {
    constructor(webSocketClient) {
        this.webSocketClient = webSocketClient;
    }

    async fetch(url, options) {
        return await this.webSocketClient.sendMessage({type: MESSAGE_TYPES.API_CALL, payload: { url, options }});
    }
}
