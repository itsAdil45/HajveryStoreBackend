const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true },
            variantName: { type: String, required: true } // Added variant name
        }
    ],
    total: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    paymentReceipt: { type: String }, // receipt image path (if online)
    status: { type: String, enum: ['pending', 'processing', 'completed'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);