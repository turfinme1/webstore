// const paypal = require("@paypal/checkout-server-sdk");
const { ASSERT, ASSERT_PEER } = require("./assert");
const { STATUS_CODES } = require("./constants");

// const paypalClient = new paypal.core.PayPalHttpClient(
//     new paypal.core.SandboxEnvironment(
//         "Aa3N2FW_E6sIybxEbJ5ioVPY8Z9x8do7NEy1CjJ6TW08FR4dSVi7fj7wsP-V5D23wTu5yVh1P4L3-Nzr",
//         "EAe1aPRgNqf7dFVM3440ZeUghaF2SIfEafX3NB-6jS-cw0QVp9hmML14_iJNKUWrspXsiXMtzc4FqQD1"
//     )
// );

class PayPalHttpClient {
    constructor(clientId, clientSecret){
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.baseURL = "https://api-m.sandbox.paypal.com";
        this.accessToken = null;
        this.getAccessToken = this.getAccessToken.bind(this);
        this.execute = this.execute.bind(this);
    }

    async getAccessToken(){
        if(this.accessToken){
            return this.accessToken;
        }

        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
        const response = await fetch(`${this.baseURL}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": `Basic ${auth}`
            },
            body: "grant_type=client_credentials"
        });
        ASSERT_PEER(response.ok, "There was an error processing the request.",
            { 
                code: STATUS_CODES.PPAL_PEER_ERROR_RESPONSE_FAILURE, long_description: "There was an error when fetching the access token for PayPal API",
            }
        );

        const data = await response.json();
        this.accessToken = data.access_token;
        return this.accessToken;
    }

    async execute(request) {
        const accessToken = await this.getAccessToken();
 
        if(request instanceof OrdersCreateRequest){
            const response = await fetch(`${this.baseURL}/v2/checkout/orders`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify(request.body)
            });
            ASSERT_PEER(response.ok, "There was an error processing the request.",
                {
                    code: STATUS_CODES.PPAL_PEER_ERROR_RESPONSE_FAILURE, long_description: "There was an error when creating PayPal order",
                }
            );

            return { result: await response.json() };
        } else if (request instanceof OrdersCaptureRequest) {
            const response = await fetch(`${this.baseURL}/v2/checkout/orders/${request.orderId}/capture`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                }
            });
            ASSERT_PEER(response.ok, "There was an error processing the request.",
                {
                    code: STATUS_CODES.PPAL_PEER_ERROR_RESPONSE_FAILURE, long_description: "There was an error when capturing PayPal payment",
                }
            );

            return { result: await response.json() };
        } else if (request instanceof OrdersGetRequest) {
            const response = await fetch(`${this.baseURL}/v2/checkout/orders/${request.orderId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                }
            });
            ASSERT_PEER(response.ok, "There was an error processing the request.",
                {
                    code: STATUS_CODES.PPAL_PEER_ERROR_RESPONSE_FAILURE, long_description: "There was an error when fetching the order details",
                }
            );

            return { result: await response.json() };
        } else {
            ASSERT( false, "Invalid type of request", 
                { 
                    code: STATUS_CODES.PPAL_INVALID_INPUT, long_description: "Invalid type of request", 
                }
            );
        }

    }    
}

class OrdersCreateRequest {
    constructor(){
        this.body = null;
        this.preferData = null;
        this.prefer = this.prefer.bind(this);
        this.requestBody = this.requestBody.bind(this);

    }

    prefer(prefer){
        this.preferData = prefer;
        return this;
    }

    requestBody(requestBody){
        this.body = requestBody;
        return this;
    }
}

class OrdersCaptureRequest {
    constructor(orderId) {
        this.orderId = orderId;
    }
}

class OrdersGetRequest {
    constructor(orderId) {
        this.orderId = orderId;
    }
}

module.exports = {
    core: {
        PayPalHttpClient
    },
    orders: {
        OrdersCreateRequest,
        OrdersCaptureRequest,
        OrdersGetRequest
    }
};