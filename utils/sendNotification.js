const admin = require('firebase-admin');

// Create service account object from environment variables
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Convert escaped newlines to actual newlines
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const sendNotification = async (fcmToken, title, body) => {
    try {
        const message = {
            token: fcmToken,
            notification: {
                title,
                body,
            },
        };

        const response = await admin.messaging().send(message);
        console.log("✅ Notification sent:", response);
    } catch (err) {
        console.log(fcmToken)
        console.error("❌ Error sending FCM notification:", err.message);
    }
};

module.exports = sendNotification;