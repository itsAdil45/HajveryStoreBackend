const mongoose = require('mongoose');


const VoucherSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    discount: { type: Number, required: true },
    expiryDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('Voucher', VoucherSchema);