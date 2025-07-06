const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
    name: { type: String, required: true }, // e.g., "500ml", "1kg", "Large"
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 }
});

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    images: {
        type: [String],
        validate: {
            validator: function (arr) {
                return arr.length >= 3;
            },
            message: "At least 3 images are required."
        },
        required: true
    },
    price: { type: Number, required: true }, // Default/base price (optional if variants are used)
    description: { type: String },
    category: { type: String },
    brand: { type: String },
    variants: [VariantSchema], // optional: different sizes, weights, etc.
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
