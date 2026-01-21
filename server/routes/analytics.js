const express = require('express');
const router = express.Router();
const Exam = require('../models/exam');
const Submission = require('../models/submission');
const User = require('../models/user');
const { auth, authorize } = require('../middleware/auth');

// GET /api/analytics/global (Super Admin only)
router.get('/global', auth, authorize('super_admin'), async (req, res) => {
    try {
        const totalExams = await Exam.countDocuments();
        const uniqueCandidates = await Submission.distinct('candidateEmail');
        const totalCandidates = uniqueCandidates.length;
        const totalAdmins = await User.countDocuments({ role: 'admin' });

        // Pass/Fail ratio (Dynamic calculation based on each exam's passing marks)
        const passFailStats = await Submission.aggregate([
            {
                $lookup: {
                    from: 'exams',
                    localField: 'examId',
                    foreignField: '_id',
                    as: 'exam'
                }
            },
            { $unwind: '$exam' },
            {
                $project: {
                    totalScore: 1,
                    passingMarks: '$exam.passingMarks',
                    passed: { $gte: ['$totalScore', '$exam.passingMarks'] }
                }
            },
            {
                $group: {
                    _id: null,
                    passed: { $sum: { $cond: ['$passed', 1, 0] } },
                    failed: { $sum: { $cond: ['$passed', 0, 1] } }
                }
            }
        ]);

        const passed = passFailStats[0] ? passFailStats[0].passed : 0;
        const failed = passFailStats[0] ? passFailStats[0].failed : 0;

        const avgScoreResult = await Submission.aggregate([
            { $group: { _id: null, avg: { $avg: '$totalScore' } } }
        ]);
        const avgScore = avgScoreResult[0] ? avgScoreResult[0].avg : 0;

        res.json({
            totalExams,
            totalCandidates,
            totalAdmins,
            passFail: { passed, failed },
            avgScore
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/analytics/exam/:id (Admin/Super Admin)
router.get('/exam/:id', auth, authorize(['admin', 'super_admin']), async (req, res) => {
    try {
        const examId = req.params.id;
        const submissions = await Submission.find({ examId });

        const totalAttempts = submissions.length;
        const scores = submissions.map(s => s.totalScore);
        const avgScore = scores.reduce((a, b) => a + b, 0) / (totalAttempts || 1);
        const maxScore = Math.max(...scores, 0);
        const minScore = Math.min(...scores, 0);

        res.json({
            examId,
            totalAttempts,
            avgScore,
            maxScore,
            minScore,
            scoreDistribution: scores
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
