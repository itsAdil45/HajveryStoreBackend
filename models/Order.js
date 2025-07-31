const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            // For regular products
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            quantity: { type: Number },
            variantName: { type: String },
            price: { type: Number }, // Store the price at time of order

            // For deals
            deal: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Deal'
            },
            dealPrice: { type: Number }, // Store deal price at time of order
            dealProducts: [{ // Store deal products at time of order
                product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
                variantName: { type: String }
            }],

            // Item type to distinguish between product and deal
            itemType: {
                type: String,
                enum: ['product', 'deal'],
                required: true,
                default: 'product'
            }
        }
    ],
    subtotal: { type: Number, required: true }, // Items total before charges
    charges: {
        delivery: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
        other: { type: Number, default: 0 },
        total: { type: Number, default: 0 } // Sum of all charges
    },
    total: { type: Number, required: true }, // Subtotal + charges.total
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    paymentReceipt: { type: String }, // receipt image path (if online)
    status: { type: String, enum: ['pending', 'processing', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

// Pre-save validation for order items
OrderSchema.pre('save', function (next) {
    for (let item of this.items) {
        if (item.itemType === 'product') {
            if (!item.product || !item.variantName || !item.quantity || !item.price) {
                return next(new Error('Product items must have product, variantName, quantity, and price'));
            }
        } else if (item.itemType === 'deal') {
            if (!item.deal || !item.dealPrice || !item.dealProducts || item.dealProducts.length === 0) {
                return next(new Error('Deal items must have deal, dealPrice, and dealProducts'));
            }
        }
    }
    next();
});

// Virtual to get order item count
OrderSchema.virtual('itemCount').get(function () {
    return this.items.length;
});

// Virtual to get total quantity (products only, deals are always 1 each)
OrderSchema.virtual('totalQuantity').get(function () {
    return this.items.reduce((total, item) => {
        return total + (item.itemType === 'product' ? item.quantity : 1);
    }, 0);
});

// Virtual to get breakdown of products vs deals
OrderSchema.virtual('breakdown').get(function () {
    const products = this.items.filter(item => item.itemType === 'product').length;
    const deals = this.items.filter(item => item.itemType === 'deal').length;

    return {
        products,
        deals,
        total: products + deals
    };
});

// Enable virtuals in JSON output
OrderSchema.set('toJSON', { virtuals: true });
OrderSchema.set('toObject', { virtuals: true });

// Index for performance
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', OrderSchema);