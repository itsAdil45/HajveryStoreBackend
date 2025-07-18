const admin = require('firebase-admin');
const serviceAccount = require('../firebase/firebase-service-account.json'); // adjust path if needed

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
