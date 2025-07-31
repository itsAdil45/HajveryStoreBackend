const mongoose = require('mongoose');

const DealSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    bannerImage: {
        type: String,
        required: true
    },
    products: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        variantName: {
            type: String,
            required: true
        }
    }],
    discount: {
        type: Number,
        required: true,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    validFrom: {
        type: Date,
        default: Date.now
    },
    validUntil: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Validation: At least 2 products required
DealSchema.pre('save', function (next) {
    if (this.products.length < 2) {
        return next(new Error('Deal must have at least 2 products'));
    }
    next();
});

// Virtual to check if deal is currently valid
DealSchema.virtual('isValid').get(function () {
    const now = new Date();
    return this.isActive &&
        now >= this.validFrom &&
        now <= this.validUntil;
});

// Virtual to calculate total original price of all products in deal
DealSchema.virtual('originalPrice').get(function () {
    if (!this.populated('products.product')) return null;

    return this.products.reduce((total, item) => {
        const product = item.product;
        const variant = product.variants.find(v => v.name === item.variantName);
        if (variant) {
            const price = variant.isOnSale ? variant.salePrice : variant.price;
            return total + price;
        }
        return total;
    }, 0);
});

// Virtual to calculate deal price (after discount)
DealSchema.virtual('dealPrice').get(function () {
    const original = this.originalPrice;
    if (original === null) return null;

    return Math.max(0, original - this.discount);
});

// Virtual to calculate savings amount
DealSchema.virtual('savings').get(function () {
    const original = this.originalPrice;
    const deal = this.dealPrice;
    if (original === null || deal === null) return null;

    return original - deal;
});

// Virtual to calculate savings percentage
DealSchema.virtual('savingsPercentage').get(function () {
    const original = this.originalPrice;
    const savings = this.savings;
    if (original === null || savings === null || original === 0) return null;

    return Math.round((savings / original) * 100);
});

// Enable virtuals in JSON output
DealSchema.set('toJSON', { virtuals: true });
DealSchema.set('toObject', { virtuals: true });

// Index for performance
DealSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

module.exports = mongoose.model('Deal', DealSchema);