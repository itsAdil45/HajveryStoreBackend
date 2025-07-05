const express = require('express');
const auth = require('../middlewares/auth');
const Product = require('../models/Product');
const User = require('../models/User');

const router = express.Router();

// Add to cart
router.post('/add', auth, async (req, res) => {
    const { productId, quantity } = req.body;
    const user = await User.findById(req.user.id);

    const existingItem = user.cart.find(item => item.product.toString() === productId);

    if (existingItem) {
        existingItem.quantity += quantity || 1;
    } else {
        user.cart.push({ product: productId, quantity: quantity || 1 });
    }

    await user.save();
    res.json({ message: 'Added to cart', cart: user.cart });
});

// Get cart
router.get('/', auth, async (req, res) => {
    const user = await User.findById(req.user.id).populate('cart.product');
    res.json(user.cart);
});

// Remove item
router.delete('/remove/:productId', auth, async (req, res) => {
    const user = await User.findById(req.user.id);
    user.cart = user.cart.filter(item => item.product.toString() !== req.params.productId);
    await user.save();
    res.json({ message: 'Item removed', cart: user.cart });
});

// Update quantity
router.put('/update', auth, async (req, res) => {
    const { productId, quantity } = req.body;
    const user = await User.findById(req.user.id);

    const cartItem = user.cart.find(item => item.product.toString() === productId);
    if (cartItem) {
        cartItem.quantity = quantity;
        await user.save();
        res.json({ message: 'Cart updated', cart: user.cart });
    } else {
        res.status(404).json({ message: 'Product not in cart' });
    }
});

module.exports = router;
