const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    hrId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String },
    coverImage: { type: String }, // Optional URL for cover image
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, required: true }, // duration in minutes
    status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'CLOSED'], default: 'DRAFT' },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    settings: {
        negativeMarkingEnabled: { type: Boolean, default: false },
        automatedEmail: { type: Boolean, default: false },
        generatePDF: { type: Boolean, default: false },
        maxAttempts: { type: Number, default: 1 },
        restrictIP: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Exam', examSchema);
