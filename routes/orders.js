const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const upload = require('../middlewares/upload');
const router = express.Router();
const sendNotification = require('../utils/sendNotification');
const moment = require('moment');

router.post('/checkout', auth, upload.single('receipt'), async (req, res) => {
    try {
        const { paymentMethod } = req.body;
        const user = await User.findById(req.user.id).populate('cart.product');
        console.log(user.email);
        if (!user.cart.length) return res.status(400).json({ message: 'Cart is empty' });

        const total = user.cart.reduce((sum, item) => {
            const product = item.product;
            let price;

            // Find the variant by name
            const variant = product.variants.find(v => v.name === item.variantName);
            if (!variant) {
                throw new Error(`Variant "${item.variantName}" not found for product "${product.name}"`);
            }

            price = variant.isOnSale ? variant.salePrice : variant.price;
            return sum + price * item.quantity;
        }, 0);

        const order = new Order({
            user: user._id,
            items: user.cart.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                variantName: item.variantName // Include variant name
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

router.get('/last_report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can access reports.' });
        }

        const { range } = req.query;

        // Determine start date
        let startDate;
        const endDate = new Date(); // now

        if (range === 'monthly') {
            startDate = moment().startOf('month').toDate();
        } else if (range === 'weekly') {
            startDate = moment().startOf('week').toDate();
        } else if (range === 'yearly') {
            startDate = moment().startOf('year').toDate();
        } else {
            return res.status(400).json({ message: 'Invalid range. Use "monthly", "weekly", or "yearly".' });
        }

        // Get orders within date range
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).select('_id total createdAt');

        const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

        const report = {
            range,
            totalOrders: orders.length,
            totalIncome,
            orders: orders.map(order => ({
                id: order._id,
                income: order.total,
                createdAt: order.createdAt
            }))
        };

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: 'Failed to generate report', error: err.message });
    }
});

router.get('/report', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can access this report.' });
        }

        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: "Please provide both 'from' and 'to' dates in YYYY-MM-DD format." });
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // include the entire 'to' day

        // Fetch orders within date range
        const orders = await Order.find({
            createdAt: { $gte: fromDate, $lte: toDate }
        })
            .populate('user', 'name email')
            .populate('items.product', 'name price variants');

        // Prepare report with variant information
        const report = orders.map(order => ({
            orderID: order._id,
            user: order.user?.name || 'Unknown',
            total: order.total,
            date: order.createdAt,
            items: order.items.map(item => ({
                product: item.product.name,
                variant: item.variantName,
                quantity: item.quantity
            }))
        }));

        // Total income
        const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

        res.json({
            from: fromDate,
            to: toDate,
            totalOrders: orders.length,
            totalIncome,
            orders: report
        });

    } catch (err) {
        res.status(500).json({ message: 'Failed to generate report', error: err.message });
    }
});

router.get('/', auth, async (req, res) => {
    const userID = req.user.id;
    const { status, orderID, userName } = req.query;

    try {
        const user = await User.findById(userID);
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can get order details." });
        }

        const query = {};

        // Apply filters
        if (status) {
            query.status = status;
        }

        if (orderID) {
            query._id = orderID;
        }

        let orders = await Order.find(query)
            .populate('user', 'name email')
            .populate('items.product', 'name price variants');

        // Filter by user name (after population)
        if (userName) {
            orders = orders.filter(order =>
                order.user?.name?.toLowerCase().includes(userName.toLowerCase())
            );
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
    }
});

router.get('/my/orders', auth, async (req, res) => {
    try {
        const userID = req.user.id;

        const orders = await Order.find({ user: userID })
            .sort({ createdAt: -1 }) // newest first
            .populate('items.product', 'name price variants');

        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch your orders', error: err.message });
    }
});

router.get('/my/orders/:id', auth, async (req, res) => {
    try {
        const userID = req.user.id;
        const orderID = req.params.id;

        const order = await Order.findOne({ _id: orderID, user: userID })
            .populate('items.product', 'name price variants');

        if (!order) {
            return res.status(404).json({ message: "Order not found or does not belong to you." });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch the order', error: err.message });
    }
});

router.get('/:id', auth, async (req, res) => {
    const userID = req.user.id;
    const orderID = req.params.id;

    try {
        const user = await User.findById(userID);
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Only admins can view order details." });
        }

        const order = await Order.findById(orderID)
            .populate('user', 'name email phone')
            .populate('items.product', 'name price variants');

        if (!order) {
            return res.status(404).json({ message: "Order not found." });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch order', error: err.message });
    }
});

router.put('/update_order/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const orderID = req.params.id;

        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== "admin") {
            return res.status(403).json({ message: "Only admins can update orders." });
        }

        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        order.status = status;
        await order.save();

        const customer = await User.findById(order.user);
        if (customer && customer.fcmToken) {
            await sendNotification(
                customer.fcmToken,
                "Order Status Updated",
                `Your order status is now: ${status}`
            );
        }

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (err) {
        res.status(500).json({ message: 'Update failed', error: err.message });
    }
});

module.exports = router;