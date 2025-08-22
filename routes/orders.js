const express = require('express');
const auth = require('../middlewares/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Deal = require('../models/Deal');
const upload = require('../middlewares/upload');
const router = express.Router();
const sendNotification = require('../utils/sendNotification');
const moment = require('moment');
const mongoose = require('mongoose');

router.post('/checkout', auth, upload.single('receipt'), async (req, res) => {
    try {
        const { paymentMethod, charges = {} } = req.body;
        const user = await User.findById(req.user.id).populate([
            { path: 'cart.product' },
            { path: 'cart.deal', populate: { path: 'products.product' } }
        ]);

        console.log(user.email);

        if (!user.cart.length) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Validate stock and deal availability before proceeding
        const stockValidation = [];
        const dealValidation = [];

        for (const item of user.cart) {
            if (item.itemType === 'product') {
                const product = item.product;

                // Check if product has sufficient stock
                if (product.stock < item.quantity) {
                    stockValidation.push({
                        productName: product.name,
                        variantName: item.variantName,
                        requestedQuantity: item.quantity,
                        availableStock: product.stock
                    });
                }
            } else if (item.itemType === 'deal') {
                const deal = item.deal;

                // Check if deal is still valid
                if (!deal || !deal.isValid) {
                    dealValidation.push({
                        dealTitle: deal ? deal.title : 'Unknown Deal',
                        issue: deal ? 'Deal has expired or is inactive' : 'Deal not found'
                    });
                }
            }
        }

        if (stockValidation.length > 0 || dealValidation.length > 0) {
            return res.status(400).json({
                message: 'Some items are not available',
                insufficientStock: stockValidation,
                invalidDeals: dealValidation
            });
        }

        // Calculate subtotal and prepare order items
        let subtotal = 0;
        const orderItems = [];

        for (const item of user.cart) {
            if (item.itemType === 'product') {
                const product = item.product;

                // Find the variant by name
                const variant = product.variants.find(v => v.name.toLowerCase() === item.variantName.toLowerCase());
                if (!variant) {
                    throw new Error(`Variant "${item.variantName}" not found for product "${product.name}"`);
                }

                const price = variant.isOnSale ? variant.salePrice : variant.price;
                const itemTotal = price * item.quantity;
                subtotal += itemTotal;

                orderItems.push({
                    itemType: 'product',
                    product: product._id,
                    quantity: item.quantity,
                    variantName: item.variantName,
                    price: price // Store the price at time of order
                });
            }

            else if (item.itemType === 'deal') {
                const deal = item.deal;
                subtotal += deal.dealPrice;

                // Store deal products at time of order
                const dealProducts = deal.products.map(dealProduct => ({
                    product: dealProduct.product._id,
                    variantName: dealProduct.variantName
                }));

                orderItems.push({
                    itemType: 'deal',
                    deal: deal._id,
                    dealPrice: deal.dealPrice,
                    dealProducts: dealProducts,
                    quantity: 1 // Deals are always quantity 1
                });
            }
        }

        // Calculate charges
        const orderCharges = {
            delivery: parseFloat(charges.delivery) || 0,
            vat: parseFloat(charges.vat) || 0,
            other: parseFloat(charges.other) || 0
        };
        orderCharges.total = orderCharges.delivery + orderCharges.vat + orderCharges.other;

        // Calculate final total
        const total = subtotal + orderCharges.total;

        // Validate online payment receipt
        if (paymentMethod === 'online' && !req.file) {
            return res.status(400).json({ message: "Receipt image required for online payment" });
        }

        // Start transaction to ensure data consistency
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Create order
            const order = new Order({
                user: user._id,
                items: orderItems,
                subtotal,
                charges: orderCharges,
                total,
                paymentMethod,
                paymentReceipt: req.file ? req.file.path : null,
            });

            await order.save({ session });

            // Deduct stock from products (for both individual products and deal products)
            for (const item of user.cart) {
                if (item.itemType === 'product') {
                    await Product.findByIdAndUpdate(
                        item.product._id,
                        { $inc: { stock: -item.quantity } },
                        { session }
                    );
                } else if (item.itemType === 'deal') {
                    // Deduct stock for each product in the deal
                    for (const dealProduct of item.deal.products) {
                        await Product.findByIdAndUpdate(
                            dealProduct.product._id,
                            { $inc: { stock: -1 } }, // Each deal consumes 1 of each product
                            { session }
                        );
                    }
                }
            }

            // Clear user cart
            user.cart = [];
            await user.save({ session });

            // Commit transaction
            await session.commitTransaction();

            // Send notification to admin
            const admin = await User.findOne({ role: 'admin' });
            if (admin && admin.fcmToken) {
                await sendNotification(
                    admin.fcmToken,
                    "New Order",
                    `Order placed by ${user.name} - Total: Rs ${total}`
                );
            }

            res.status(201).json({
                message: 'Order placed successfully',
                order: {
                    _id: order._id,
                    user: user._id,
                    subtotal,
                    charges: orderCharges,
                    total,
                    paymentMethod,
                    status: order.status,
                    createdAt: order.createdAt,
                    breakdown: order.breakdown
                }
            });

        } catch (error) {
            // Rollback transaction on error
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({ message: 'Checkout failed', error: err.message });
    }
});

router.get('/my/orders/:id', auth, async (req, res) => {
    try {
        const userID = req.user.id;
        const orderID = req.params.id;

        const order = await Order.findOne({ _id: orderID, user: userID })
            .populate('items.product', 'name price variants')
            .populate('items.deal', 'title discount originalPrice dealPrice bannerImage')
            .populate('items.dealProducts.product');

        if (!order) {
            return res.status(404).json({ message: "Order not found or does not belong to you." });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch the order', error: err.message });
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

        // Get orders within date range with breakdown
        const orders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate }
        }).select('_id total createdAt items');

        const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);

        // Calculate breakdown statistics
        let totalProducts = 0;
        let totalDeals = 0;

        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.itemType === 'product') {
                    totalProducts++;
                } else if (item.itemType === 'deal') {
                    totalDeals++;
                }
            });
        });

        const report = {
            range,
            totalOrders: orders.length,
            totalIncome,
            breakdown: {
                totalProducts,
                totalDeals
            },
            orders: orders.map(order => ({
                id: order._id,
                income: order.total,
                createdAt: order.createdAt,
                breakdown: order.breakdown
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
            .populate('items.product', 'name price variants')
            .populate('items.deal', 'title discount products');

        // Prepare report with variant and deal information
        const report = orders.map(order => ({
            orderID: order._id,
            user: order.user?.name || 'Unknown',
            total: order.total,
            date: order.createdAt,
            breakdown: order.breakdown,
            items: order.items.map(item => {
                if (item.itemType === 'product') {
                    return {
                        type: 'product',
                        product: item.product.name,
                        variant: item.variantName,
                        quantity: item.quantity,
                        price: item.price
                    };
                } else if (item.itemType === 'deal') {
                    return {
                        type: 'deal',
                        deal: item.deal?.title || 'Unknown Deal',
                        dealPrice: item.dealPrice,
                        quantity: 1,
                        productsInDeal: item.dealProducts.length
                    };
                }
            })
        }));

        // Total income and breakdown
        const totalIncome = orders.reduce((sum, order) => sum + order.total, 0);
        let totalProducts = 0;
        let totalDeals = 0;

        orders.forEach(order => {
            totalProducts += order.breakdown.products;
            totalDeals += order.breakdown.deals;
        });

        res.json({
            from: fromDate,
            to: toDate,
            totalOrders: orders.length,
            totalIncome,
            breakdown: {
                totalProducts,
                totalDeals
            },
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
            .populate('items.product', 'name price variants images')
            .populate('items.deal', 'title discount originalPrice dealPrice');

        console.log(orders);
        // if (userName) {
        //     orders = orders.filter(order =>
        //         order.user?.name?.toLowerCase().includes(userName.toLowerCase())
        //     );
        // }
        // Filter by user name (after population)

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
            .populate('items.product', 'name price variants')
            .populate('items.deal', 'title discount originalPrice dealPrice');

        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch your orders', error: err.message });
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
            .populate('items.product', 'name price variants')
            .populate('items.deal', 'title discount originalPrice dealPrice bannerImage')
            .populate('items.dealProducts.product');

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