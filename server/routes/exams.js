const express = require('express');
const router = express.Router();
const Exam = require('../models/exam');
const Question = require('../models/question');
const Submission = require('../models/submission');
const { sendResultEmail } = require('../utils/email');

const { auth } = require('../middleware/auth');

// Middleware would be needed here to verify teacher/admin role

// Create Exam (HR)
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, coverImage, startTime, endTime, duration, questions, settings } = req.body;
        const hrId = req.user._id;

        // 1. Create Exam
        const exam = new Exam({
            hrId,
            title,
            description,
            coverImage,
            startTime,
            endTime,
            duration,
            settings
        });
        await exam.save();

        // 2. Create Questions
        const questionDocs = await Question.insertMany(
            questions.map(q => ({
                ...q,
                examId: exam._id
            }))
        );

        // 3. Link Questions to Exam (Optional if we use examId in question, but exam model has questions array)
        exam.questions = questionDocs.map(q => q._id);
        await exam.save();

        res.status(201).json({ exam, questions: questionDocs });
    } catch (err) {
        console.error('SERVER ERROR: Create Exam Failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get all exams
router.get('/', async (req, res) => {
    try {
        const exams = await Exam.find().populate('hrId', 'name').sort({ createdAt: -1 });
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single exam with questions
router.get('/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });
        const questions = await Question.find({ examId: exam._id });
        res.json({ exam, questions });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update exam (Super Admin/HR)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, coverImage, startTime, endTime, duration, questions, settings } = req.body;

        // Find the exam
        const exam = await Exam.findById(id);
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // 1. Update/Create/Delete Questions
        const existingQuestionIds = questions.filter(q => q._id).map(q => q._id.toString());

        // Delete questions that are no longer in the payload
        await Question.deleteMany({
            examId: id,
            _id: { $nin: existingQuestionIds }
        });

        const updatedQuestionIds = [];
        for (const q of questions) {
            if (q._id) {
                // Update existing question
                await Question.findByIdAndUpdate(q._id, {
                    ...q,
                    examId: id
                });
                updatedQuestionIds.push(q._id);
            } else {
                // Create new question
                const newQ = new Question({
                    ...q,
                    examId: id
                });
                await newQ.save();
                updatedQuestionIds.push(newQ._id);
            }
        }

        // Update exam's questions array and metadata
        exam.title = title;
        exam.description = description;
        exam.coverImage = coverImage;
        exam.startTime = startTime;
        exam.endTime = endTime;
        exam.duration = duration;
        exam.settings = settings;
        exam.questions = updatedQuestionIds;
        await exam.save();

        res.json({ exam, questions: await Question.find({ examId: id }) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Delete exam (Super Admin only)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Find and delete the exam
        const exam = await Exam.findById(id);
        if (!exam) {
            return res.status(404).json({ error: 'Exam not found' });
        }

        // Delete all associated questions
        await Question.deleteMany({ examId: id });

        // Delete the exam
        await Exam.findByIdAndDelete(id);

        res.json({ message: 'Exam and associated questions deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Update exam settings partially
router.patch('/:id/settings', async (req, res) => {
    try {
        const { id } = req.params;
        const { settings } = req.body;

        const exam = await Exam.findById(id);
        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // Merge new settings with existing ones
        exam.settings = { ...exam.settings, ...settings };
        await exam.save();

        res.json({ message: 'Settings updated successfully', settings: exam.settings });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Bulk Send Results (Emails to everyone)
router.post('/:id/send-results-bulk', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Fetch Exam and Questions (for total marks)
        const exam = await Exam.findById(id);
        const questions = await Question.find({ examId: id });
        const totalPossibleMarks = questions.reduce((sum, q) => sum + q.marks, 0);

        if (!exam) return res.status(404).json({ error: 'Exam not found' });

        // 2. Fetch all submissions
        const submissions = await Submission.find({ examId: id });

        if (submissions.length === 0) {
            return res.status(400).json({ error: 'No submissions found for this exam' });
        }

        // 3. Send emails in background
        let successCount = 0;
        let failCount = 0;

        const emailPromises = submissions.map(sub => {
            return sendResultEmail(sub.candidateEmail, sub.candidateName, exam.title, sub.totalScore, totalPossibleMarks, questions, sub.answers)
                .then(success => {
                    if (success) successCount++;
                    else failCount++;
                })
                .catch(err => {
                    console.error(`Bulk email failure for ${sub.candidateEmail}:`, err);
                    failCount++;
                });
        });

        await Promise.all(emailPromises);

        res.json({
            message: 'Bulk email process completed',
            summary: {
                total: submissions.length,
                success: successCount,
                failed: failCount
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
