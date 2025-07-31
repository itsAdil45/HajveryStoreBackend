const express = require('express');
const Deal = require('../models/Deal');
const Product = require('../models/Product');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const User = require('../models/User');
const router = express.Router();

// Admin middleware
const isAdmin = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
};

// Create a new deal (Admin only)
router.post('/add', auth, isAdmin, upload.single('bannerImage'), async (req, res) => {
    try {
        const { title, description, products, discount, validUntil } = req.body;

        // Validate required fields
        if (!title || !description || !products || !discount || !validUntil) {
            return res.status(400).json({
                message: 'Title, description, products, discount, and validUntil are required'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                message: 'Banner image is required'
            });
        }

        // Parse products if it's a JSON string
        let dealProducts = products;
        if (typeof products === 'string') {
            try {
                dealProducts = JSON.parse(products);
            } catch (parseErr) {
                return res.status(400).json({
                    message: 'Invalid products format',
                    error: 'Products must be valid JSON'
                });
            }
        }

        // Validate products array
        if (!Array.isArray(dealProducts) || dealProducts.length < 2) {
            return res.status(400).json({
                message: 'Deal must have at least 2 products'
            });
        }

        // Validate each product and variant exists
        for (const item of dealProducts) {
            if (!item.product || !item.variantName) {
                return res.status(400).json({
                    message: 'Each product must have product ID and variant name'
                });
            }

            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(404).json({
                    message: `Product with ID ${item.product} not found`
                });
            }

            const variant = product.variants.find(v => v.name.toLowerCase() === item.variantName.toLowerCase());
            if (!variant) {
                return res.status(404).json({
                    message: `Variant '${item.variantName}' not found in product '${product.name}'`,
                    availableVariants: product.variants.map(v => v.name)
                });
            }
        }

        // Create deal
        const deal = new Deal({
            title,
            description,
            bannerImage: req.file.path,
            products: dealProducts,
            discount: parseFloat(discount),
            validUntil: new Date(validUntil)
        });

        await deal.save();

        // Populate products for response
        await deal.populate('products.product');

        res.status(201).json({
            message: 'Deal created successfully',
            deal
        });

    } catch (error) {
        res.status(400).json({
            message: 'Failed to create deal',
            error: error.message
        });
    }
});

// Update deal (Admin only)
router.put('/update/:id', auth, isAdmin, upload.single('bannerImage'), async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        const updatedData = { ...req.body };

        // Handle banner image update
        if (req.file) {
            updatedData.bannerImage = req.file.path;
        }

        // Handle products update
        if (updatedData.products) {
            let dealProducts = updatedData.products;
            if (typeof dealProducts === 'string') {
                try {
                    dealProducts = JSON.parse(dealProducts);
                } catch (parseErr) {
                    return res.status(400).json({
                        message: 'Invalid products format',
                        error: 'Products must be valid JSON'
                    });
                }
            }

            if (!Array.isArray(dealProducts) || dealProducts.length < 2) {
                return res.status(400).json({
                    message: 'Deal must have at least 2 products'
                });
            }

            // Validate products and variants
            for (const item of dealProducts) {
                if (!item.product || !item.variantName) {
                    return res.status(400).json({
                        message: 'Each product must have product ID and variant name'
                    });
                }

                const product = await Product.findById(item.product);
                if (!product) {
                    return res.status(404).json({
                        message: `Product with ID ${item.product} not found`
                    });
                }

                const variant = product.variants.find(v => v.name.toLowerCase() === item.variantName.toLowerCase());
                if (!variant) {
                    return res.status(404).json({
                        message: `Variant '${item.variantName}' not found in product '${product.name}'`
                    });
                }
            }

            updatedData.products = dealProducts;
        }

        // Handle validUntil date conversion
        if (updatedData.validUntil) {
            updatedData.validUntil = new Date(updatedData.validUntil);
        }

        const updated = await Deal.findByIdAndUpdate(
            req.params.id,
            updatedData,
            { new: true, runValidators: true }
        ).populate('products.product');

        res.json({
            message: 'Deal updated successfully',
            deal: updated
        });

    } catch (error) {
        res.status(400).json({
            message: 'Failed to update deal',
            error: error.message
        });
    }
});

// Activate/Deactivate deal (Admin only)
router.patch('/toggle/:id', auth, isAdmin, async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id);
        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        deal.isActive = !deal.isActive;
        await deal.save();

        res.json({
            message: `Deal ${deal.isActive ? 'activated' : 'deactivated'} successfully`,
            deal: { _id: deal._id, title: deal.title, isActive: deal.isActive }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to toggle deal status',
            error: error.message
        });
    }
});

// Delete deal (Admin only)
router.delete('/delete/:id', auth, isAdmin, async (req, res) => {
    try {
        const deleted = await Deal.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        res.json({ message: 'Deal deleted successfully' });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to delete deal',
            error: error.message
        });
    }
});

// Get all deals (Public - shows only active and valid deals to users, all deals to admins)
router.get('/', async (req, res) => {
    try {
        const { includeInactive } = req.query;
        let query = {};

        // If not specifically requesting inactive deals, filter for active and valid ones
        if (!includeInactive) {
            const now = new Date();
            query = {
                isActive: true,
                validFrom: { $lte: now },
                validUntil: { $gte: now }
            };
        }

        const deals = await Deal.find(query)
            .populate('products.product')
            .sort({ createdAt: -1 });

        res.json({
            deals,
            count: deals.length
        });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch deals',
            error: error.message
        });
    }
});

// Get single deal (Public)
router.get('/:id', async (req, res) => {
    try {
        const deal = await Deal.findById(req.params.id)
            .populate('products.product');

        if (!deal) {
            return res.status(404).json({ message: 'Deal not found' });
        }

        res.json(deal);

    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch deal',
            error: error.message
        });
    }
});

// Get deals for admin (shows all deals with filters)
router.get('/admin/all', auth, isAdmin, async (req, res) => {
    try {
        const { status, expired } = req.query;
        let query = {};

        if (status === 'active') {
            query.isActive = true;
        } else if (status === 'inactive') {
            query.isActive = false;
        }

        if (expired === 'true') {
            query.validUntil = { $lt: new Date() };
        } else if (expired === 'false') {
            query.validUntil = { $gte: new Date() };
        }

        const deals = await Deal.find(query)
            .populate('products.product')
            .sort({ createdAt: -1 });

        res.json({
            deals,
            count: deals.length
        });

    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch deals',
            error: error.message
        });
    }
});

module.exports = router;