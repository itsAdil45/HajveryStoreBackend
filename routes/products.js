const express = require('express');
const Product = require('../models/Product');
const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
    const { search, category, brand } = req.query;

    const query = {};

    if (search) {
        query.name = { $regex: search, $options: 'i' }; // case-insensitive search
    }

    if (category) {
        query.category = category;
    }

    if (brand) {
        query.brand = brand;
    }

    try {
        const products = await Product.find(query);
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch products', error: err.message });
    }
});


// Get single product
router.get('/:id', async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
});

module.exports = router;
