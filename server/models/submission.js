const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    // For registered admins/teachers testing the system
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // For candidates (no login)
    candidateEmail: { type: String },
    candidateName: { type: String },
    answers: [{
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        answer: { type: String }, // MCQ option or Short Answer text
        marksObtained: { type: Number, default: 0 },
        isGraded: { type: Boolean, default: false }
    }],
    totalScore: { type: Number, default: 0 },
    maxPossibleMarks: { type: Number, default: 0 },
    status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'PENDING'], default: 'IN_PROGRESS' },
    metadata: {
        ipAddress: { type: String },
        userAgent: { type: String },
        submittedAt: { type: Date },
        tabSwitchCount: { type: Number, default: 0 },
        isFlagged: { type: Boolean, default: false },
        violationLogs: [{
            type: { type: String }, // TAB_HIDDEN, WINDOW_BLUR, FULLSCREEN_EXIT
            timestamp: { type: Date, default: Date.now },
            duration: { type: Number, default: 0 }, // seconds
            returnTime: { type: Date }
        }],
        totalAwayTime: { type: Number, default: 0 }, // total seconds
        endedByPolicy: { type: Boolean, default: false }
    },
    submittedAt: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Submission', submissionSchema);
