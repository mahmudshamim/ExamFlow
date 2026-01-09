const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { auth, authorize } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid email or password' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Invalid email or password' });

        const token = jwt.sign(
            { _id: user._id, role: user.role, email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/create-admin (Super Admin only)
router.post('/create-admin', auth, authorize('super_admin'), async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ error: 'Email already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newAdmin = new User({
            name,
            email,
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();

        res.status(201).json({ message: 'Admin created successfully', admin: { id: newAdmin._id, email: newAdmin.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
