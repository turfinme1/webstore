const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const { ASSERT_USER } = require('./assert');

const projectId = "wstore-d58d3";
const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
const auth = new GoogleAuth({
    keyFile: path.join(__dirname, "..", "..", "firebase-private-key.json"),
    scopes: ["https://www.googleapis.com/auth/firebase.messaging"]
});

async function getAccessToken() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  return token;
}

async function sendNotification(subscriptionData, payload, options = {}) {
    const accessToken = await getAccessToken();
    const subscriptionToken = subscriptionData.token;
    const parsedPayload = JSON.parse(payload);

    const requestBody = { 
        message: {
            token: subscriptionToken,
            
            notification: {
                title: parsedPayload.title,
                body:  parsedPayload.body,
                image: parsedPayload.image,
            },

            data: {
                id: parsedPayload.id,
            },

            webpush: {
                headers: {
                    TTL: options.TTL,
                    Urgency: options.urgency,
                    Topic: options.topic,
                },
                notification: {
                    icon:   parsedPayload.icon,   
                    badge:  parsedPayload.badge,
                    image:  parsedPayload.image,
                    actions: parsedPayload.actions,
                },
            },
        },
    };

    const response = await fetch(fcmUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        const responseData = await response.json();
        ASSERT_USER(response.status < 400 || response.status >= 500,
            `Firebase request error: ${responseData.error.message}`, {
            code: "FIREBASE.MESSAGING.000034.SEND_NOTIFICATION",
            long_description: "Failed to send notification",
            body: responseData,
        });
        ASSERT(false, `Firebase request error: ${responseData.error.message}`, {
            code: "FIREBASE.MESSAGING.000035.SEND_NOTIFICATION",
            long_description: "Failed to send notification",
            body: responseData,
        });
    }
}

module.exports = {
    sendNotification,
}