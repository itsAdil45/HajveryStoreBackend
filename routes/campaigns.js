// routes/campaigns.js
const express = require('express');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const Campaign = require('../models/Campaign');
const Product = require('../models/Product');
const User = require('../models/User');

const router = express.Router();

// 🔸 Create a new campaign with banner upload
router.post('/create', auth, upload.single('banner'), async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create campaigns.' });
        }

        const { title, startDate, endDate } = req.body;

        const newCampaign = new Campaign({
            title,
            banner: req.file.path,
            startDate,
            endDate,
            isActive: false,
            products: []
        });

        await newCampaign.save();
        res.status(201).json({ message: 'Campaign created successfully.', campaign: newCampaign });
    } catch (err) {
        res.status(500).json({ message: 'Failed to create campaign', error: err.message });
    }
});

// 🔸 Add products to campaign with sale price
router.put('/add-products/:campaignId', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can modify campaigns.' });
        }

        const { products } = req.body; // array of { product, salePrice }
        const campaign = await Campaign.findById(req.params.campaignId);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        campaign.products.push(...products);
        await campaign.save();

        res.json({ message: 'Products added to campaign.', campaign });
    } catch (err) {
        res.status(500).json({ message: 'Failed to add products', error: err.message });
    }
});

// 🔸 Toggle campaign active/inactive
router.put('/toggle/:id', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);
        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can change campaign status.' });
        }

        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

        campaign.isActive = !campaign.isActive;
        await campaign.save();

        res.json({ message: `Campaign ${campaign.isActive ? 'activated' : 'deactivated'}.`, campaign });
    } catch (err) {
        res.status(500).json({ message: 'Failed to toggle campaign', error: err.message });
    }
});
