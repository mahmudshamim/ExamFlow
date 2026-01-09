require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/user');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/examflow';

async function seedAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        const email = 'it@examflow.com';
        const existingAdmin = await User.findOne({ email });

        if (existingAdmin) {
            console.log('Admin user already exists.');
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            const admin = new User({
                name: 'IT Admin',
                email: email,
                password: hashedPassword,
                role: 'it_admin'
            });

            await admin.save();
            console.log('IT Admin created successfully!');
            console.log('Email: it@examflow.com');
            console.log('Password: admin123');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seedAdmin();
