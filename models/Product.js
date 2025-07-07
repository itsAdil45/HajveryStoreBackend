const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    salePrice: { type: Number },
    saleDuration: {
        start: { type: Date },
        end: { type: Date }
    }
});

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    images: {
        type: [String],
        required: true,
        validate: {
            validator: arr => arr.length >= 3,
            message: "At least 3 images are required."
        }
    },
    price: { type: Number, required: true }, // Base price
    description: { type: String },
    category: { type: String },
    brand: { type: String },
    variants: [VariantSchema],
    isOnSale: { type: Boolean, default: false },
    salePrice: {
        type: Number,
        required: function () {
            return this.isOnSale && (!this.variants || this.variants.length === 0);
        }
    },
    saleDuration: {
        start: { type: Date },
        end: { type: Date }
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
