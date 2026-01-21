require('dotenv').config();
const mongoose = require('mongoose');
const Submission = require('../models/submission');
const Question = require('../models/question');

async function fix() {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        const submissions = await Submission.find({
            $or: [
                { maxPossibleMarks: 0 },
                { maxPossibleMarks: { $exists: false } }
            ]
        });

        console.log(`📝 Found ${submissions.length} submissions to fix.`);

        for (const sub of submissions) {
            console.log(`🔍 Processing submission ${sub._id} for Exam ${sub.examId}...`);
            const questions = await Question.find({ examId: sub.examId });
            const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

            sub.maxPossibleMarks = totalMarks;
            await sub.save();
            console.log(`✅ Fixed: ${totalMarks} total marks.`);
        }

        console.log('🎉 All submissions updated successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during fix:', err);
        process.exit(1);
    }
}

fix();
