const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['MCQ', 'SHORT_ANSWER'], required: true },
    options: [{ type: String }], // only for MCQ
    correctAnswer: { type: String }, // MCQ correct option or Short Answer key points
    marks: { type: Number, default: 1 },
    negativeMarking: { type: Number, default: 0 },
    required: { type: Boolean, default: false }
});

module.exports = mongoose.model('Question', questionSchema);
