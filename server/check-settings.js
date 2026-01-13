require('dotenv').config();
const mongoose = require('mongoose');
const Exam = require('./models/exam');

async function checkExams() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const exams = await Exam.find({}, 'title settings.automatedEmail');
        console.log('\n--- Exam Settings Check ---');
        if (exams.length === 0) {
            console.log('No exams found.');
        } else {
            exams.forEach(exam => {
                console.log(`Exam: ${exam.title}`);
                console.log(`   Automated Email: ${exam.settings.automatedEmail ? '✅ ON' : '❌ OFF'}`);
                console.log('---------------------------');
            });
        }
        process.exit();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

checkExams();
