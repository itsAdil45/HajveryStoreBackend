const mongoose = require('mongoose');
const DealSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true }, // e.g., 10 (if %) or 50 (if fixed)
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        variantName: { type: String, required: true }, // Optional if variant-specific
        quantity: { type: Number, default: 1 }
    }],
    image: { type: String }, // Optional deal banner
    isActive: { type: Boolean, default: true },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Deal', DealSchema);