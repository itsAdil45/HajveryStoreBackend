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
            // For regular products
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            quantity: { type: Number, default: 1, min: 1 },
            variantName: { type: String },

            // For deals
            deal: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Deal"
            },

            // Item type to distinguish between product and deal
            itemType: {
                type: String,
                enum: ['product', 'deal'],
                required: true,
                default: 'product'
            }
        }
    ],
}, { timestamps: true });

// Pre-save validation for cart items
UserSchema.pre('save', function (next) {
    for (let item of this.cart) {
        if (item.itemType === 'product') {
            if (!item.product || !item.variantName) {
                return next(new Error('Product items must have product ID and variant name'));
            }
        } else if (item.itemType === 'deal') {
            if (!item.deal) {
                return next(new Error('Deal items must have deal ID'));
            }
        }
    }
    next();
});

module.exports = mongoose.model('User', UserSchema);