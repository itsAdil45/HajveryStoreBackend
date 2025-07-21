const mongoose = require('mongoose');

// Variant Schema
const VariantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    isOnSale: { type: Boolean, default: false },
    salePrice: {
        type: Number,
        required: function () {
            return this.isOnSale;
        }
    },
}, { _id: false });

// Product Schema
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    brand: { type: String, required: true },
    category: {
        main: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
        sub: { type: String, required: true }
    },
    images: {
        type: [String],
        required: true,
        validate: {
            validator: arr => arr.length >= 3,
            message: "At least 3 images are required."
        }
    },
    stock: { type: Number, required: true }, // Total stock or main stock
    variants: {
        type: [VariantSchema],
        required: true,
        validate: {
            validator: arr => arr.length >= 1,
            message: "At least one variant is required."
        }
    }
}, { timestamps: true });

// Virtual fields for pricing
ProductSchema.virtual('priceRange').get(function () {
    if (this.variants.length === 0) return null;

    const prices = this.variants.map(v => v.isOnSale ? v.salePrice : v.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return min === max ? `$${min}` : `$${min} - $${max}`;
});

ProductSchema.virtual('startingPrice').get(function () {
    if (this.variants.length === 0) return null;

    const prices = this.variants.map(v => v.isOnSale ? v.salePrice : v.price);
    return Math.min(...prices);
});

// Check if any variant is on sale
ProductSchema.virtual('hasActiveSale').get(function () {
    return this.variants.some(v => v.isOnSale);
});

// Get the best (lowest) current price
ProductSchema.virtual('bestPrice').get(function () {
    if (this.variants.length === 0) return null;

    const currentPrices = this.variants.map(v => v.isOnSale ? v.salePrice : v.price);
    return Math.min(...currentPrices);
});

// Enable virtuals in JSON output
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', ProductSchema);