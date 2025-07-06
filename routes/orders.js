const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const upload = require('../middlewares/upload');
const router = express.Router();
const sendNotification = require('../utils/sendNotification');

router.post('/checkout', auth, upload.single('receipt'), async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        const user = await User.findById(req.user.id).populate('cart.product');

        if (!user.cart.length) return res.status(400).json({ message: 'Cart is empty' });

        const total = user.cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

        const order = new Order({
            user: user._id,
            items: user.cart.map(item => ({
                product: item.product._id,
                quantity: item.quantity
            })),
            total,
            paymentMethod,
            paymentReceipt: req.file ? req.file.path : null,
        });

        await order.save();
        user.cart = [];
        await user.save();

        if (paymentMethod === 'online' && !req.file) {
            return res.status(400).json({ message: "Receipt image required for online payment" });
        }
        const admin = await User.findOne({ role: 'admin' });

        if (admin && admin.fcmToken) {
            await sendNotification(
                admin.fcmToken,
                "New Order",
                `Order placed by ${user.name}`
            );
        }
        res.status(201).json({ message: 'Order placed successfully', order });
    } catch (err) {
        res.status(500).json({ message: 'Checkout failed', error: err.message });
    }
});

module.exports = router;
