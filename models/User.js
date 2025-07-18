// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: { type: String, required: true },
    role: { type: String, default: "user" },
    resetOTP: { type: String },
    resetOTPExpiry: { type: Date },
    emailOTP: { type: String },
    emailOTPExpiry: { type: Date },
    isEmailVerified: { type: Boolean, default: false },
    fcmToken: { type: String },
    cart: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            quantity: { type: Number, default: 1, min: 1 },
            variantName: { type: String, required: true } // Use variant name instead of ID
        }
    ],
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);