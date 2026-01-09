require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'superadmin@examflow.com'; // Default Super Admin
        const password = 'rootpassword123'; // Default Password -> Change Immediately

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Super Admin already exists.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new User({
            name: 'System Owner',
            email,
            password: hashedPassword,
            role: 'super_admin'
        });

        await admin.save();
        console.log(`Super Admin created: ${email} / ${password}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
