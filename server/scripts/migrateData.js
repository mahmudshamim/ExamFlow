const mongoose = require('mongoose');
const User = require('../models/user');
const Exam = require('../models/exam'); // Ensure you have this model
// Add other models if needed, e.g., Result/Submission

// --- CONFIGURATION ---
const SOURCE_URI = 'mongodb://127.0.0.1:27017/examflow'; // Your Local DB
// Paste your Atlas URI here (copy from Vercel env or your notes)
const DEST_URI = 'mongodb+srv://ExamFlow:s9AEcFPkgUhGI0B5@examflow.jm83w55.mongodb.net/examflow?retryWrites=true&w=majority&appName=ExamFlow';
// ---------------------

const migrate = async () => {
    try {
        console.log('📦 Starting Migration...');

        // 1. Fetch Data from Source (Local)
        console.log('connecting to Source (Local)...');
        await mongoose.connect(SOURCE_URI);

        console.log('Fetching Users...');
        const users = await User.find().lean();
        console.log(`Found ${users.length} users.`);

        console.log('Fetching Exams...');
        // Note: Make sure "Exam" model name matches your file export
        const exams = await Exam.find().lean();
        console.log(`Found ${exams.length} exams.`);

        // Close Source Connection
        await mongoose.connection.close();
        console.log('✅ Source data fetched. Connection closed.');

        // 2. Insert Data into Destination (Atlas)
        console.log('connecting to Destination (Atlas)...');
        await mongoose.connect(DEST_URI);

        if (users.length > 0) {
            console.log('Inserting Users...');
            // Loop and use upsert to avoid duplicate key errors
            for (const user of users) {
                await User.updateOne(
                    { email: user.email },
                    { $set: user },
                    { upsert: true }
                );
            }
            console.log('✅ Users inserted/updated.');
        }

        if (exams.length > 0) {
            console.log('Inserting Exams...');
            for (const exam of exams) {
                // Assuming title or _id is unique enough, or just use _id
                await Exam.updateOne(
                    { _id: exam._id },
                    { $set: exam },
                    { upsert: true }
                );
            }
            console.log('✅ Exams inserted/updated.');
        }

        console.log('🎉 MIGRATION COMPLETE!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Migration Failed:', error);
        process.exit(1);
    }
};

migrate();
