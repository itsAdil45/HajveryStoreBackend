const express = require('express');
const auth = require('../middlewares/auth');
const Product = require('../models/Product');
const Deal = require('../models/Deal');
const User = require('../models/User');
const router = express.Router();

router.post('/add', auth, async (req, res) => {
    try {
        const { productId, dealId, quantity = 1, variantName, itemType } = req.body;
        const userId = req.user.id;

        if (!itemType || !['product', 'deal'].includes(itemType)) {
            return res.status(400).json({
                message: 'Item type must be either "product" or "deal"'
            });
        }

        if (itemType === 'product') {
            if (!productId || !variantName) {
                return res.status(400).json({
                    message: 'Product ID and variant name are required for products'
                });
            }
        } else if (itemType === 'deal') {
            if (!dealId) {
                return res.status(400).json({
                    message: 'Deal ID is required for deals'
                });
            }
        }

        if (quantity < 1) {
            return res.status(400).json({
                message: 'Quantity must be at least 1'
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Handle product addition
        if (itemType === 'product') {
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

            // Check if item already exists in cart
            const existingItem = user.cart.find(item =>
                item.itemType === 'product' &&
                item.product && item.product.toString() === productId &&
                item.variantName === variantName
            );

            if (existingItem) {
                existingItem.quantity += quantity;
                console.log(`Updated existing product in cart: ${existingItem.product}`);
            } else {
                user.cart.push({
                    product: productId,
                    quantity: quantity,
                    variantName: variantName,
                    itemType: 'product'
                });
                console.log(`Added new product to cart: ${productId}`);
            }
        }

        // Handle deal addition
        else if (itemType === 'deal') {
            // Check if deal exists and is valid
            const deal = await Deal.findById(dealId);
            if (!deal) {
                return res.status(404).json({ message: 'Deal not found' });
            }

            if (!deal.isValid) {
                return res.status(400).json({
                    message: 'Deal is not currently active or has expired',
                    dealStatus: {
                        isActive: deal.isActive,
                        validFrom: deal.validFrom,
                        validUntil: deal.validUntil
                    }
                });
            }

            // Check if deal already exists in cart
            const existingDeal = user.cart.find(item =>
                item.itemType === 'deal' &&
                item.deal && item.deal.toString() === dealId
            );


            if (existingDeal) {
                existingDeal.quantity += quantity;
            } else {
                user.cart.push({
                    deal: dealId,
                    quantity: quantity,
                    itemType: 'deal'
                });
            }
        }

        await user.save();

        // Populate cart for response
        await user.populate([
            { path: 'cart.product' },
            { path: 'cart.deal', populate: { path: 'products.product' } }
        ]);

        res.json({
            message: `${itemType === 'product' ? 'Product' : 'Deal'} added to cart successfully`,
            cart: user.cart
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Get cart with full details and pricing
router.get('/', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate([
            { path: 'cart.product' },
            { path: 'cart.deal', populate: { path: 'products.product' } }
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Process cart items with details
        const cartWithDetails = user.cart.map(item => {
            if (item.itemType === 'product') {
                const product = item.product;
                if (!product) return null; // Skip if product is deleted

                const variant = product.variants.find(v => v.name === item.variantName);
                if (!variant) return null; // Skip if variant doesn't exist

                const price = variant.isOnSale ? variant.salePrice : variant.price;
                const subtotal = price * item.quantity;

                return {
                    _id: item._id,
                    itemType: 'product',
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
            }

            else if (item.itemType === 'deal') {
                const deal = item.deal;
                if (!deal) return null; // Skip if deal is deleted

                // Check if deal is still valid
                if (!deal.isValid) {
                    return {
                        _id: item._id,
                        itemType: 'deal',
                        deal: {
                            _id: deal._id,
                            title: deal.title,
                            isExpired: true
                        },
                        quantity: 1,
                        subtotal: 0,
                        error: 'Deal has expired or is no longer active'
                    };
                }

                return {
                    _id: item._id,
                    itemType: 'deal',
                    deal: {
                        _id: deal._id,
                        title: deal.title,
                        description: deal.description,
                        bannerImage: deal.bannerImage,
                        products: deal.products.map(dealProduct => ({
                            _id: dealProduct.product._id,
                            name: dealProduct.product.name,
                            images: dealProduct.product.images,
                            brand: dealProduct.product.brand,
                            variantName: dealProduct.variantName
                        })),
                        originalPrice: deal.originalPrice,
                        dealPrice: deal.dealPrice,
                        discount: deal.discount,
                        savings: deal.savings,
                        savingsPercentage: deal.savingsPercentage,
                        validUntil: deal.validUntil
                    },
                    quantity: 1,
                    subtotal: deal.dealPrice
                };
            }

            return null;
        }).filter(item => item !== null); // Remove invalid items

        const total = cartWithDetails.reduce((sum, item) => sum + item.subtotal, 0);
        const totalQuantity = cartWithDetails.reduce((sum, item) => sum + item.quantity, 0);

        res.json({
            cart: cartWithDetails,
            summary: {
                itemCount: cartWithDetails.length,
                totalQuantity: totalQuantity,
                total: total,
                breakdown: {
                    products: cartWithDetails.filter(item => item.itemType === 'product').length,
                    deals: cartWithDetails.filter(item => item.itemType === 'deal').length
                }
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

// Update cart item quantity (only for products, deals are always quantity 1)
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

        // Check if it's a deal (deals can't have quantity updated)
        // if (cartItem.itemType === 'deal') {
        //     return res.status(400).json({
        //         message: 'Deal quantities cannot be updated. Deals are fixed bundles.'
        //     });
        // }

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

// Remove item from cart (works for both products and deals)
router.delete('/remove/:itemId', auth, async (req, res) => {
    try {
        const { itemId } = req.params;
        const user = await User.findById(req.user.id);

        const itemToRemove = user.cart.id(itemId);
        if (!itemToRemove) {
            return res.status(404).json({ message: 'Cart item not found' });
        }

        const itemType = itemToRemove.itemType;

        // Filter out the item by its ObjectId string
        user.cart = user.cart.filter(item => item._id.toString() !== itemId);
        await user.save();

        res.json({
            message: `${itemType === 'product' ? 'Product' : 'Deal'} removed from cart successfully`
        });
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

// Get cart summary (quick overview)
router.get('/summary', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate([
            { path: 'cart.product' },
            { path: 'cart.deal', populate: { path: 'products.product' } }
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let totalItems = 0;
        let totalPrice = 0;
        let productCount = 0;
        let dealCount = 0;

        user.cart.forEach(item => {
            if (item.itemType === 'product' && item.product) {
                const variant = item.product.variants.find(v => v.name === item.variantName);
                if (variant) {
                    const price = variant.isOnSale ? variant.salePrice : variant.price;
                    totalPrice += price * item.quantity;
                    totalItems += item.quantity;
                    productCount++;
                }
            } else if (item.itemType === 'deal' && item.deal && item.deal.isValid) {
                totalPrice += item.deal.dealPrice;
                totalItems += 1;
                dealCount++;
            }
        });

        res.json({
            summary: {
                totalItems,
                totalPrice,
                productCount,
                dealCount,
                isEmpty: user.cart.length === 0
            }
        });

    } catch (error) {
        res.status(500).json({
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;