
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-analytics.js";
import { getMessaging, getToken, onMessage, deleteToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";

const firebaseConfig = {
    apiKey: "AIzaSyBMOLsOyAzpeiSTe2YVlWb2fNYffdEpTTg",
    authDomain: "wstore-d58d3.firebaseapp.com",
    projectId: "wstore-d58d3",
    storageBucket: "wstore-d58d3.firebasestorage.app",
    messagingSenderId: "628386078029",
    appId: "1:628386078029:web:cfd0f2ae99d556c11b2b04",
    measurementId: "G-K0Y8D6LHK5"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);
console.log("Firebase initialized successfully");

export { app, analytics, messaging, getToken, onMessage, deleteToken };