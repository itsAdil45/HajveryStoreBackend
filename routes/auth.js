const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middlewares/auth');
const sendEmail = require('../utils/sendEmail');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, phone, email, password, fcmToken, address } = req.body;

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) return res.status(400).json({ message: "Phone already registered" });

        const existingEmail = await User.findOne({ email });
        if (existingEmail) return res.status(400).json({ message: "Email already registered" });

        const hashed = await bcrypt.hash(password, 10);

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        const user = new User({
            name,
            phone,
            email,
            password: hashed,
            role: "user",
            fcmToken,
            emailOTP: otp,
            address
            // emailOTPExpiry: Date.now() + 10 * 60 * 1000, // 10 minutes
        });

        await user.save();

        await sendEmail(
            email,
            "Verify Your Email",
            `Your verification code is: ${otp}`
        );

        res.status(201).json({ message: "Registration successful. Please verify your email with the OTP sent." });

    } catch (err) {
        console.error("Register error:", err.message);
        res.status(500).json({ message: "Server error", error: err.message });
    }
});


router.post('/verify-email', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        if (user.isEmailVerified) return res.json({ message: "Email already verified" });

        if (user.emailOTP !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.isEmailVerified = true;
        user.emailOTP = null;
        // user.emailOTPExpiry = null;
        await user.save();


        res.json({ message: "Email verified successfully", status: "success" });


    } catch (err) {
        res.status(500).json({ message: "Verification failed", error: err.message });
    }
});


// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid email or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });
        if (!user.isEmailVerified) {
            return res.status(403).json({ message: "Email not verified. Please verify before logging in.", status: 403 });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, name: user.name, phone: user.phone, role: user.role }, status: "success" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

// change pass
router.post('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ message: "Password changed successfully", status: "success" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

router.post('/request-reset-otp/:type', async (req, res) => {
    try {
        const { email } = req.body;
        const { type } = req.params;
        let statusTxt;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found", status: 403 });

        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        if (type === "email") {
            if (user.isEmailVerified) return res.json({ message: "Email already verified" });
            user.emailOTP = otp;
            user.emailOTPExpiry = Date.now() + 1000 * 60 * 10; // 10 min expiry
            statusTxt = "email verification";
        } else {
            user.resetOTP = otp;
            user.resetOTPExpiry = Date.now() + 1000 * 60 * 10; // 10 min expiry
            statusTxt = "password reset";

        }

        await user.save();

        await sendEmail(
            user.email,
            "Your OTP Code",
            `Your OTP code for ${statusTxt} is: ${otp}`
        );

        res.json({ message: "OTP sent to email", status: "success" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message, status: 500 });
    }
});


router.post('/reset-password-otp', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        const user = await User.findOne({
            email,
            resetOTP: otp,
            resetOTPExpiry: { $gt: Date.now() },
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired OTP" });

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetOTP = undefined;
        user.resetOTPExpiry = undefined;
        await user.save();

        res.json({ message: "Password reset successful", status: "success" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
});

module.exports = router;
