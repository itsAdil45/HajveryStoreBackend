const express = require('express');
const Product = require('../models/Product');
const auth = require('../middlewares/auth');
const router = express.Router();
const upload = require('../middlewares/upload'); // ✅ use cloudinary
const User = require('../models/User');

const isAdmin = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
};
router.post('/add', auth, isAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const imageUrls = req.files.map(file => file.path);

        // Parse variants if they're sent as JSON string
        let variants = req.body.variants;
        if (typeof variants === 'string') {
            variants = JSON.parse(variants);
        }

        const product = new Product({
            ...req.body,
            images: imageUrls,
            variants: variants || [{
                name: "Default",
                price: req.body.price,
                isOnSale: req.body.isOnSale || false,
                salePrice: req.body.salePrice
            }]
        });

        await product.save();
        res.status(201).json({ message: "Product added", product });
    } catch (err) {
        res.status(400).json({ message: "Failed to add product", error: err.message });
    }
});

router.put('/update/:id', auth, isAdmin, upload.array('images', 5), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const updatedData = { ...req.body };

        // Handle variants - parse if it's a JSON string
        if (updatedData.variants) {
            if (typeof updatedData.variants === 'string') {
                try {
                    updatedData.variants = JSON.parse(updatedData.variants);
                } catch (parseErr) {
                    return res.status(400).json({
                        message: "Invalid variants format",
                        error: "Variants must be valid JSON"
                    });
                }
            }

            // Validate variants array
            if (!Array.isArray(updatedData.variants) || updatedData.variants.length === 0) {
                return res.status(400).json({
                    message: "Variants must be a non-empty array"
                });
            }
        }

        // Handle images - only update if new images are provided
        if (req.files && req.files.length > 0) {
            updatedData.images = req.files.map(file => file.path);
        }

        // Handle category updates - ensure proper structure
        if (req.body['category[main]']) {
            updatedData.category = {
                main: req.body['category[main]'],
                sub: req.body['category[sub]'] || product.category.sub
            };
            // Clean up the form-data style keys
            delete updatedData['category[main]'];
            delete updatedData['category[sub]'];
        }

        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            updatedData,
            {
                new: true,
                runValidators: true
            }
        );

        res.json({ message: "Product updated", product: updated });
    } catch (err) {
        res.status(400).json({ message: "Update failed", error: err.message });
    }
});
router.delete('/delete/:id', auth, isAdmin, async (req, res) => {
    try {
        const deleted = await Product.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: "Product not found" });
        res.json({ message: "Product deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed", error: err.message });
    }
});
// Get all products
router.get('/', async (req, res) => {
    const { search, category, brand, hasActiveSale, page = 1, limit = 10 } = req.query;
    const query = {};

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { 'category.sub': { $regex: search, $options: 'i' } },
            { brand: { $regex: search, $options: 'i' } },
        ];
    }

    if (category) {
        query['category.sub'] = { $regex: category, $options: 'i' };
    }

    if (brand) {
        query.brand = brand;
    }

    if (hasActiveSale === 'true') {
        query['variants.isOnSale'] = true;
    }

    // Convert page and limit to numbers and validate
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    // Validate pagination parameters
    if (pageNum < 1) {
        return res.status(400).json({ message: 'Page number must be greater than 0' });
    }

    if (limitNum < 1 || limitNum > 100) {
        return res.status(400).json({ message: 'Limit must be between 1 and 100' });
    }

    const skip = (pageNum - 1) * limitNum;

    console.log("Query:", query); // Debugging line to check the query
    console.log("Pagination - Page:", pageNum, "Limit:", limitNum, "Skip:", skip);

    try {
        // Get total count for pagination metadata
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limitNum);

        // Get paginated products
        const products = await Product.find(query)
            .skip(skip)
            .limit(limitNum)
            .lean(); // Use lean() for better performance if you don't need Mongoose document methods

        // Return paginated response with metadata
        res.json({
            products,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalProducts,
                hasNextPage: pageNum < totalPages,
                hasPreviousPage: pageNum > 1,
                limit: limitNum
            }
        });
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
