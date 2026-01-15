const express = require('express');
const router = express.Router();
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
        const exam = await Exam.findById(examId);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // 2. Check Attempt Restriction (only for new submissions, skip for finalizing draft)
        if (!submissionId && exam.settings.maxAttempts > 0) {
            const previousSubmissions = await Submission.countDocuments({ examId, candidateEmail, status: { $ne: 'IN_PROGRESS' } });
            if (previousSubmissions >= exam.settings.maxAttempts) {
                return res.status(403).json({ error: 'Maximum attempts reached for this assessment.' });
            }
        }

        // 3. Calculate Score
        const questionsList = await Question.find({ examId });
        let totalScore = 0;
        let totalPossibleMarks = questionsList.reduce((sum, q) => sum + q.marks, 0);
        let finalStatus = 'GRADED';

        const gradedAnswers = answers.map(ans => {
            const question = questionsList.find(q => q._id.toString() === ans.questionId);
            if (!question) return ans;
            let marksObtained = 0;
            let isGraded = false;

            if (question.type === 'MCQ' && question.correctAnswer) {
                isGraded = true;
                if (ans.answer === question.correctAnswer) {
                    marksObtained = question.marks;
                } else if (exam.settings.negativeMarkingEnabled && ans.answer !== "") {
                    marksObtained = -question.negativeMarking;
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
            submission = await Submission.findById(submissionId);
            submission.answers = gradedAnswers;
            submission.totalScore = Math.max(0, totalScore);
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
                candidateEmail,
                candidateName,
                answers: gradedAnswers,
                totalScore: Math.max(0, totalScore),
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
            sendResultEmail(candidateEmail, candidateName, exam.title, submission.totalScore, totalPossibleMarks, questionsList, gradedAnswers)
                .then(success => console.log(`Post-submission email result: ${success}`))
                .catch(err => console.error(`Post-submission email crash:`, err));
        }

        res.status(201).json({
            message: 'Assessment submitted successfully',
            submissionId: submission._id,
            score: submission.totalScore,
            totalMarks: totalPossibleMarks
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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
            const question = questions.find(q => q._id.toString() === update.questionId);
            if (!question) continue;

            if (update.marksObtained > question.marks) {
                return res.status(400).json({
                    error: `Question "${question.text.substring(0, 30)}..." cannot have more than ${question.marks} marks. You provided ${update.marksObtained}.`
                });
            }
            // Removed negative marks restriction to allow penalty marks


            const answerIndex = submission.answers.findIndex(ans => ans.questionId.toString() === update.questionId);
            if (answerIndex !== -1) {
                submission.answers[answerIndex].marksObtained = update.marksObtained;
                submission.answers[answerIndex].isGraded = true;
            }
        }

        // Recalculate total score
        submission.totalScore = submission.answers.reduce((sum, ans) => sum + (ans.marksObtained || 0), 0);

        // Check if all questions are now graded
        const allGraded = submission.answers.every(ans => ans.isGraded);
        if (allGraded) {
            submission.status = 'GRADED';
        }

        submission.markModified('answers');
        await submission.save();

        // Automated email removed from manual grading route. 
        // Admin will now send results manually from the dashboard.

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
