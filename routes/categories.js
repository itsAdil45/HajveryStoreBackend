const express = require("express");
const router = express.Router();
const Category = require('../models/Category');
const auth = require("../middlewares/auth");
const upload = require("../middlewares/upload");
const User = require("../models/User");

router.post("/create_main", auth, upload.single('icon'), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "admin") {
            return res.status(401).json({ message: 'Unauthorized.', status: 401 });
        }

        const { name } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "Icon image is required.", status: 400 });
        }
        const icon = req.file?.path

        const newCategory = new Category({
            name,
            icon,
            subCategories: []
        });

        await newCategory.save();

        res.status(201).json({ message: 'Category created successfully.', category: newCategory, status: "success" });

    } catch (err) {
        res.status(500).json({ message: "Failed to create category", error: err.message, status: 500 });
    }
});


router.put("/add_sub/:mainCatID", auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Only admin can perform this action" });
        }

        const { subCategories } = req.body; // Expecting: ["Soft Drinks", "Juices"]
        if (!Array.isArray(subCategories)) {
            return res.status(400).json({ message: "subCategories should be an array of names", status: 400 });
        }

        const mainCategory = await Category.findById(req.params.mainCatID);
        if (!mainCategory) {
            return res.status(404).json({ message: "Main category not found", status: 404 });
        }

        const existingNames = mainCategory.subCategories.map(sub => sub.name);

        const newSubs = subCategories.filter(name => !existingNames.includes(name));

        newSubs.forEach(name => {
            mainCategory.subCategories.push({ name });
        });

        await mainCategory.save();

        res.status(200).json({
            message: `Added ${newSubs.length} new sub-categories`,
            added: newSubs,
            skipped: subCategories.filter(name => existingNames.includes(name)),
            category: mainCategory,
            status: "success"
        });

    } catch (err) {
        res.status(500).json({ message: "Failed to add sub-categories", error: err.message, status: 500 });
    }
});



router.put("/edit_main/:id", auth, upload.single("icon"), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== "admin") {
            return res.status(401).json({ message: "Unauthorized.", status: 401 });
        }

        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found", status: 404 });
        }

        const { name } = req.body;

        // Handle name update
        if (name) {
            category.name = name;
        }

        // Handle icon update
        if (req.file) {
            category.icon = req.file.path;
        }

        // Handle removeSubCategories from stringified JSON
        let removeSubs = [];
        if (req.body.removeSubCategories) {
            try {
                removeSubs = JSON.parse(req.body.removeSubCategories);
            } catch (e) {
                return res.status(400).json({ message: "Invalid removeSubCategories format. Must be JSON array.", status: 400 });
            }

            if (Array.isArray(removeSubs)) {
                category.subCategories = category.subCategories.filter(
                    sub => !removeSubs.includes(sub.name)
                );
            }
        }

        await category.save();
        res.json({ message: "Category updated successfully", category, status: "success" });

    } catch (err) {
        res.status(500).json({ message: "Failed to update category", error: err.message, status: 500 });
    }
});


// router.get("/all_main", async (req, res) => {
//     try {
//         const categories = await Category.find();
//         res.json({ categories: categories, status: "success" });
//     } catch (err) {
//         res.status(500).json({ message: "Failed to fetch categories", error: err.message });
//     }

// });

router.get("/sub_by_main/:id", async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.json({ subCategories: category.subCategories, status: "success" });
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch subcategories", error: err.message, status: 500 });
    }
});

router.get("/all_main", async (req, res) => {
    try {
        const { search } = req.query;

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: "i" }; // case-insensitive search
        }

        const categories = await Category.find(query);
        res.json({ categories: categories, status: "success" });

    } catch (err) {
        res.status(500).json({ message: "Failed to fetch categories", error: err.message, status: 500 });
    }
});

module.exports = router;
