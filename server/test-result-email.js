require('dotenv').config();
const { sendResultEmail } = require('./utils/email');

// Test data
const testData = {
    to: 'mahmud.shamim.codes@gmail.com',
    employeeName: 'Mahmud (Test)',
    assessmentTitle: 'Sample Assessment - Email Test',
    score: 8,
    totalMarks: 10,
    questions: [
        { _id: '1', text: 'What is JavaScript?', marks: 2 },
        { _id: '2', text: 'Explain React hooks', marks: 3 },
        { _id: '3', text: 'What is Node.js?', marks: 2 },
        { _id: '4', text: 'Describe MongoDB', marks: 3 }
    ],
    answers: [
        { questionId: '1', marksObtained: 2, isGraded: true },
        { questionId: '2', marksObtained: 3, isGraded: true },
        { questionId: '3', marksObtained: 1, isGraded: true },
        { questionId: '4', marksObtained: 2, isGraded: true }
    ]
};

console.log('🧪 Testing assessment result email with new template...\n');

sendResultEmail(
    testData.to,
    testData.employeeName,
    testData.assessmentTitle,
    testData.score,
    testData.totalMarks,
    testData.questions,
    testData.answers
).then(success => {
    if (success) {
        console.log('✅ Assessment result email sent successfully!');
        console.log(`📧 Check inbox: ${testData.to}`);
    } else {
        console.log('❌ Email sending failed');
    }
    process.exit();
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
