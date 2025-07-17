const express = require("express");
const router = express.Router();
const Category = require('../models/Category');
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const User = require("../models/User");

// ✅ Create main category
router.post("/create_main", auth, upload.single('icon'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "admin") {
            return res.status(401).json({ message: 'Unauthorized.' });
        }

        const { name } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "Icon image is required." });
        }
        const icon = req.file?.path

        const newCategory = new Category({
            name,
            icon,
            subCategories: []
        });

        await newCategory.save();

        res.status(201).json({ message: 'Category created successfully.', category: newCategory });

    } catch (err) {
        res.status(500).json({ message: "Failed to create category", error: err.message });
    }
});


// ✅ Add sub-categories to main category
router.put("/add_sub/:mainCatID", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Only admin can perform this action" });
        }

        const { subCategories } = req.body; // Example: ["Soft Drinks", "Juices"]
        if (!Array.isArray(subCategories)) {
            return res.status(400).json({ message: "subCategories should be an array of names" });
        }

        const mainCategory = await Category.findById(req.params.mainCatID);
        if (!mainCategory) {
            return res.status(404).json({ message: "Main category not found" });
        }

        // Push subcategories
        subCategories.forEach(name => {
            mainCategory.subCategories.push({ name });
        });

        await mainCategory.save();

        res.status(200).json({ message: "Sub-categories added", category: mainCategory });

    } catch (err) {
        res.status(500).json({ message: "Failed to add sub-categories", error: err.message });
    }
});

module.exports = router;
