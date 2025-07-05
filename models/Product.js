const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    description: { type: String },
    stock: { type: Number, default: 0 },
    category: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);
