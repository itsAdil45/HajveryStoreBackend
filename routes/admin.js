const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Save or update FCM token for admin
router.post('/save-token', async (req, res) => {
    try {
        const { fcmToken } = req.body;

        if (!fcmToken) {
            return res.status(400).json({ message: 'FCM token is required' });
        }

        // Assuming there's only 1 admin for now
        const admin = await User.findOne({ role: 'admin' });

        if (!admin) {
            return res.status(404).json({ message: 'Admin user not found' });
        }

        admin.fcmToken = fcmToken;
        await admin.save();

        res.status(200).json({ message: 'FCM token saved successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
