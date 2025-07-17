const express = require('express');
const User = require('../models/User');
const auth = require('../middlewares/auth');

const router = express.Router();


router.get('/users/:id', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view user profiles.' });
        }

        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user profile', error: err.message });
    }
});


router.get('/users', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can view all users.' });
        }

        const users = await User.find({ role: 'user' }).select('-password'); // exclude password
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
});
router.delete('/users/:id', auth, async (req, res) => {
    try {
        const admin = await User.findById(req.user.id);

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can delete users.' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'You cannot delete another admin.' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete user', error: err.message });
    }
});

router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
    }
});

router.put('/update-profile', auth, async (req, res) => {
    try {
        const userID = req.user.id;
        const { name, phone, address } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            userID,
            { name, phone, address },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'Profile updated successfully.', user: updatedUser });
    } catch (err) {
        res.status(500).json({ message: 'Failed to update profile', error: err.message });
    }
});

module.exports = router;
