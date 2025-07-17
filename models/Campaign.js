// models/Campaign.js
const mongoose = require('mongoose');

const CampaignProductSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    salePrice: {
        type: Number,
        required: true
    }
});

const CampaignSchema = new mongoose.Schema({
    title: { type: String, required: true },
    banner: { type: String, required: true }, // image URL
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: false },
    products: [CampaignProductSchema]
}, { timestamps: true });

module.exports = mongoose.model('Campaign', CampaignSchema);
