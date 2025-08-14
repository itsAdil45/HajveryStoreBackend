const homeConfigSchema = require('../models/HomeConfig');
const User = require("../models/User");
const auth = require('../middlewares/auth');
const express = require('express');
const router = express.Router();
const categorySchema = require('../models/Category');
const dailyMessageSchema = require('../models/DailyMessage');


router.post('/add-config', auth, async (req, res) => {
    try {
        const { category, title } = req.body;
        if (!category || !title) {
            return res.status(400).json({ message: 'Category and title are required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const categoryExists = await categorySchema.findOne({
            $or: [
                { name: category },
                { 'subCategories.name': category }
            ]
        });
        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const newConfig = new homeConfigSchema({
            category, // spelling fixed in schema
            title,
            user: req.user._id
        });

        const isNewConfigExists = await homeConfigSchema.findOne({ category });
        if (isNewConfigExists) {
            return res.status(409).json({ message: 'Configuration already exists' });
        }

        await newConfig.save();
        const configs = await homeConfigSchema.find();
        res.status(201).json({ message: 'Configuration added successfully', config: configs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/home-config', async (req, res) => {
    try {
        const configs = await homeConfigSchema.find();
        res.status(200).json(configs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
})

router.delete('/home-config/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const config = await homeConfigSchema.findByIdAndDelete(id);
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }

        res.status(200).json({ message: 'Configuration deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/home-config/:id', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const { category, title } = req.body;
        if (!category && !title) {
            return res.status(400).json({ message: 'Category or title must be provided' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const config = await homeConfigSchema.findById(id);
        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }

        const categoryExists = await categorySchema.findOne({
            $or: [
                { name: category },
                { 'subCategories.name': category }
            ]
        });
        if (!categoryExists) {
            return res.status(404).json({ message: 'Category not found' });
        }

        config.category = category || config.category;
        config.title = title || config.title;

        await config.save();
        res.status(200).json({ message: 'Configuration updated successfully', config });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/daily-message', auth, async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required' });
        }

        const updatedMessage = await dailyMessageSchema.findOneAndUpdate(
            {}, // empty filter = match the first document
            { message },
            { new: true, upsert: true } // new = return updated doc, upsert = create if doesn't exist
        );

        res.status(200).json({ message: 'Daily message updated successfully', updatedMessage });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;