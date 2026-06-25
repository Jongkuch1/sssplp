const express = require('express');
const router = express.Router();
const Submission = require('../models/Submission');
const auth = require('../middleware/auth');

// Student submits an assignment
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can submit assignments' });
    }
    const submission = await Submission.create({ ...req.body, studentId: req.user.id });
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Teacher/admin: all submissions for an assignment
router.get('/assignment/:assignmentId', auth, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const submissions = await Submission.find({ assignmentId: req.params.assignmentId }).populate('studentId', 'name email');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// A student's own submissions (or any submissions, for teacher/admin)
router.get('/student/:studentId', auth, async (req, res) => {
  try {
    if (req.user.id !== req.params.studentId && req.user.role === 'student') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const submissions = await Submission.find({ studentId: req.params.studentId }).populate('assignmentId', 'title subject grade');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Teacher/admin grades a submission
router.put('/:id/grade', auth, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Only teachers and administrators can grade submissions' });
    }
    const { grade, comments } = req.body;
    const submission = await Submission.findByIdAndUpdate(
      req.params.id,
      { grade, comments, status: 'graded', gradedAt: new Date() },
      { new: true }
    );
    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
