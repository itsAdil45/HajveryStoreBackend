const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
    name: { type: String },
}, { _id: false });

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    icon: { type: String },
    subCategories: [subCategorySchema]
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
