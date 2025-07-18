const express = require('express');
const auth = require('../middlewares/auth');
const Product = require('../models/Product');
const User = require('../models/User');
const router = express.Router();
// Add to cart

// Add to cart
router.post('/add', auth, async (req, res) => {
    try {
        const { productId, quantity = 1, variantName } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!productId || !variantName) {
            return res.status(400).json({
                message: 'Product ID and variant name are required'
            });
        }

        if (quantity < 1) {
            return res.status(400).json({
                message: 'Quantity must be at least 1'
            });
        }

        // Check if product exists and has the specified variant
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const variant = product.variants.find(v => v.name === variantName);
        if (!variant) {
            return res.status(404).json({
                message: 'Variant not found',
                availableVariants: product.variants.map(v => v.name)
            });
        }

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if item already exists in cart
        const existingItem = user.cart.find(item =>
            item.product.toString() === productId &&
            item.variantName === variantName
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            user.cart.push({
                product: productId,
                quantity: quantity,
                variantName: variantName
            });
        }

        await user.save();

        // Populate cart for response
        await user.populate('cart.product');

        res.json({
            message: 'Added to cart successfully',
            cart: user.cart
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Get cart with full product details and pricing
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('cart.product');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Calculate cart totals and add variant details
        const cartWithDetails = user.cart.map(item => {
            const product = item.product;
            const variant = product.variants.find(v => v.name === item.variantName);

            if (!variant) {
                return null; // Skip invalid items
            }

            const price = variant.isOnSale ? variant.salePrice : variant.price;
            const subtotal = price * item.quantity;

            return {
                _id: item._id,
                product: {
                    _id: product._id,
                    name: product.name,
                    images: product.images,
                    brand: product.brand
                },
                variant: {
                    name: variant.name,
                    price: variant.price,
                    isOnSale: variant.isOnSale,
                    salePrice: variant.salePrice,
                    currentPrice: price
                },
                quantity: item.quantity,
                subtotal: subtotal
            };
        }).filter(item => item !== null); // Remove invalid items

        const total = cartWithDetails.reduce((sum, item) => sum + item.subtotal, 0);

        res.json({
            cart: cartWithDetails,
            summary: {
                itemCount: cartWithDetails.length,
                totalQuantity: cartWithDetails.reduce((sum, item) => sum + item.quantity, 0),
                total: total
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Update cart item quantity
router.patch('/update/:itemId', auth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                message: 'Quantity must be at least 1'
            });
        }

        const user = await User.findById(req.user.id);
        const cartItem = user.cart.id(itemId);

        if (!cartItem) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        cartItem.quantity = quantity;
        await user.save();

        res.json({
            message: 'Cart updated successfully',
            updatedItem: cartItem
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

router.delete('/remove/:itemId', auth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const user = await User.findById(req.user.id);

        // Filter out the item by its ObjectId string
        user.cart = user.cart.filter(item => item._id.toString() !== itemId);
        await user.save();

        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});


// Clear entire cart
router.delete('/clear', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        user.cart = [];
        await user.save();

        res.json({ message: 'Cart cleared successfully' });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});


module.exports = router;
