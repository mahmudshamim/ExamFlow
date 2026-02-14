const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Submission = require('../models/submission');
const Exam = require('../models/exam');
const Question = require('../models/question');
const { sendResultEmail } = require('../utils/email');

// Initialize Submission (Draft)
router.post('/start', async (req, res) => {
    try {
        const { examId, candidateEmail, candidateName } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        const submission = new Submission({
            examId,
            candidateEmail,
            candidateName,
            status: 'IN_PROGRESS',
            metadata: {
                ipAddress,
                userAgent: req.headers['user-agent']
            }
        });

        await submission.save();
        res.status(201).json({ submissionId: submission._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Log Violation in Real-time
router.patch('/:id/log-violation', async (req, res) => {
    try {
        const { type, duration, returnTime, timestamp } = req.body;
        const submission = await Submission.findById(req.params.id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        submission.metadata.tabSwitchCount += 1;

        // Add detailed log entry
        submission.metadata.violationLogs.push({
            type,
            timestamp: timestamp || new Date(),
            duration: duration || 0,
            returnTime: returnTime || null
        });

        // Sum up total away time
        if (duration) {
            submission.metadata.totalAwayTime = (submission.metadata.totalAwayTime || 0) + duration;
        }

        await submission.save();
        res.json({
            count: submission.metadata.tabSwitchCount,
            totalAwayTime: submission.metadata.totalAwayTime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Autosave Progress
router.patch('/:id/autosave', async (req, res) => {
    try {
        const { answers } = req.body;
        const submission = await Submission.findById(req.params.id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        submission.answers = answers;
        submission.markModified('answers');
        await submission.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit Assessment (Finalize)
router.post('/', async (req, res) => {
    try {
        const { examId, candidateEmail, candidateName, answers, tabSwitchCount, isFlagged, endedByPolicy, violationLogs, submissionId } = req.body;
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // 1. Fetch Exam Settings
        if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
            return res.status(400).json({ error: 'Invalid Exam ID' });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // 2. Check Attempt Restriction (only for new submissions, skip for finalizing draft)
        if (!submissionId && exam.settings.maxAttempts > 0) {
            const previousSubmissions = await Submission.countDocuments({ examId, candidateEmail: candidateEmail.toLowerCase(), status: { $ne: 'IN_PROGRESS' } });
            if (previousSubmissions >= exam.settings.maxAttempts) {
                return res.status(403).json({ error: 'Maximum attempts reached for this assessment.' });
            }
        }

        // 3. Calculate Score
        const questionsList = await Question.find({ examId });
        let totalScore = 0;
        let totalPossibleMarks = 0;
        let finalStatus = 'GRADED';

        const gradedAnswers = answers.map(ans => {
            const question = questionsList.find(q => q._id.toString() === ans.questionId);
            if (!question) return ans;

            const qMarks = question.marks || 0;
            const qNegMarks = question.negativeMarking || 0;
            totalPossibleMarks += qMarks;

            let marksObtained = 0;
            let isGraded = false;

            if (question.type === 'MCQ' && question.correctAnswer) {
                isGraded = true;
                if (ans.answer === question.correctAnswer) {
                    marksObtained = qMarks;
                } else if (exam.settings.negativeMarkingEnabled && ans.answer && ans.answer !== "") {
                    marksObtained = -qNegMarks;
                }
            } else {
                finalStatus = 'PENDING';
                isGraded = false;
            }

            if (isGraded) totalScore += marksObtained;
            return { ...ans, marksObtained, isGraded };
        });

        // 4. Update or Create Submission
        let submission;
        if (submissionId) {
            if (!mongoose.Types.ObjectId.isValid(submissionId)) {
                return res.status(400).json({ error: 'Invalid Submission ID' });
            }
            submission = await Submission.findById(submissionId);
            if (!submission) {
                console.error(`Submision not found for ID: ${submissionId}`);
                return res.status(404).json({ error: 'Draft submission session not found. Please refresh and try again.' });
            }

            submission.answers = gradedAnswers;
            submission.totalScore = Math.max(0, totalScore);
            submission.maxPossibleMarks = totalPossibleMarks;
            submission.status = finalStatus;
            submission.submittedAt = new Date();
            submission.metadata.submittedAt = new Date();
            submission.metadata.isFlagged = isFlagged || false;
            submission.metadata.endedByPolicy = endedByPolicy || false;
            if (violationLogs) submission.metadata.violationLogs = violationLogs;
            if (tabSwitchCount !== undefined) submission.metadata.tabSwitchCount = tabSwitchCount;
        } else {
            submission = new Submission({
                examId,
                candidateEmail: candidateEmail.toLowerCase(),
                candidateName,
                answers: gradedAnswers,
                totalScore: Math.max(0, totalScore),
                maxPossibleMarks: totalPossibleMarks,
                status: finalStatus,
                submittedAt: new Date(),
                metadata: {
                    ipAddress,
                    userAgent,
                    submittedAt: new Date(),
                    tabSwitchCount: tabSwitchCount || 0,
                    isFlagged: isFlagged || false,
                    endedByPolicy: endedByPolicy || false,
                    violationLogs: violationLogs || []
                }
            });
        }

        await submission.save();

        // 5. Automated Email (Send immediately if toggle is ON)
        if (exam.settings.automatedEmail) {
            console.log(`Sending automated email for ${candidateEmail} (Status: ${finalStatus})`);
            // We use .then().catch() to avoid blocking the response, but log any issues.
            sendResultEmail(candidateEmail, candidateName, exam.title, submission.totalScore, totalPossibleMarks, questionsList, gradedAnswers)
                .then(success => console.log(`Post-submission email result for ${candidateEmail}: ${success}`))
                .catch(err => console.error(`Post-submission email CRASH for ${candidateEmail}:`, err));
        }

        res.status(201).json({
            message: 'Assessment submitted successfully',
            submissionId: submission._id,
            score: submission.totalScore,
            totalMarks: totalPossibleMarks
        });

    } catch (err) {
        console.error('SUBMISSION ROUTE ERROR:', err);
        res.status(500).json({ error: 'An unexpected error occurred while processing your submission', message: err.message });
    }
});

// Get Assessment Analytics
router.get('/analytics/:examId', async (req, res) => {
    try {
        const { examId } = req.params;

        // 1. Fetch all submissions for this exam
        const submissions = await Submission.find({ examId });
        if (submissions.length === 0) {
            return res.json({
                totalSubmissions: 0,
                averageScore: 0,
                topperList: [],
                questionStats: []
            });
        }

        // 2. Fetch Exam and Questions for context
        const exam = await Exam.findById(examId);
        const questions = await Question.find({ examId });

        // 3. Calculate Average Score
        const totalScore = submissions.reduce((sum, s) => sum + s.totalScore, 0);
        const averageScore = totalScore / submissions.length;

        // 4. Generate Topper List
        const topperList = submissions
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 5)
            .map(s => ({
                name: s.candidateName,
                email: s.candidateEmail,
                score: s.totalScore,
                submittedAt: s.submittedAt
            }));

        // 5. Question-wise Analysis
        const questionStats = questions.map(q => {
            const correctCount = submissions.filter(s => {
                const ans = s.answers.find(a => a.questionId.toString() === q._id.toString());
                return ans && ans.marksObtained > 0;
            }).length;

            return {
                questionText: q.text,
                type: q.type,
                successRate: (correctCount / submissions.length) * 100
            };
        });

        res.json({
            examTitle: exam.title,
            totalSubmissions: submissions.length,
            averageScore: averageScore.toFixed(2),
            topperList,
            questionStats
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Get all submissions for a specific exam (List View)
router.get('/exam/:examId', async (req, res) => {
    try {
        const { examId } = req.params;
        const submissions = await Submission.find({ examId }).sort({ submittedAt: -1 });
        res.json(submissions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a submission (Super Admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const submission = await Submission.findById(id);
        if (!submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }

        await Submission.findByIdAndDelete(id);
        res.json({ message: 'Submission deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Manual Grading for pending questions
router.patch('/:id/grade', async (req, res) => {
    try {
        const { id } = req.params;
        const { gradedAnswers } = req.body; // Array of { questionId, marksObtained }

        const submission = await Submission.findById(id);
        if (!submission) return res.status(404).json({ error: 'Submission not found' });

        // Fetch questions to verify max marks
        const questions = await Question.find({ examId: submission.examId });

        // Update specific answers with validation
        for (const update of gradedAnswers) {
            // Priority 1: Match by ID
            let answerIndex = submission.answers.findIndex(ans => ans.questionId?.toString() === update.questionId);

            // Priority 2: Fallback to index (for historical data mismatch)
            if (answerIndex === -1 && typeof update.index === 'number' && submission.answers[update.index]) {
                answerIndex = update.index;
            }

            if (answerIndex !== -1) {
                submission.answers[answerIndex].marksObtained = update.marksObtained;
                submission.answers[answerIndex].isGraded = true;
            }
        }

        // Recalculate total score and max possible marks
        submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.marksObtained || 0), 0);
        submission.maxPossibleMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

        // Check if all questions are now graded
        const allGraded = submission.answers.every(ans => ans.isGraded);
        if (allGraded) {
            submission.status = 'GRADED';
        }

        submission.markModified('answers');
        await submission.save();

        res.json({ message: 'Grading updated successfully', submission });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Check attempts for a specific email
router.get('/check-attempts', async (req, res) => {
    try {
        const { examId, email } = req.query;
        if (!examId || !email) {
            return res.status(400).json({ error: 'Exam ID and Email are required' });
        }

        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        const previousSubmissions = await Submission.countDocuments({ examId, candidateEmail: email.toLowerCase() });
        const maxAttempts = exam.settings.maxAttempts || 1;

        res.json({
            attempts: previousSubmissions,
            maxAttempts,
            allowed: previousSubmissions < maxAttempts
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
