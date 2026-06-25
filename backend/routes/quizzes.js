const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const auth = require('../middleware/auth');

// Get quizzes (approved by default; ?mine=true for a teacher's own; ?status=X for admin review queue)
router.get('/', auth, async (req, res) => {
  try {
    let filter = { status: 'approved' };
    if (req.query.mine === 'true') {
      filter = { teacherId: req.user.id };
    } else if (req.query.status && req.user.role === 'admin') {
      filter = { status: req.query.status };
    }
    const quizzes = await Quiz.find(filter).populate('teacherId', 'name');
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create quiz
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers and administrators can create quizzes' });
    }
    const quiz = new Quiz({ ...req.body, teacherId: req.user.id });
    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Edit a quiz (owning teacher or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    if (quiz.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own quizzes' });
    }
    const { title, subject, grade, questions, timeLimit } = req.body;
    if (title !== undefined) quiz.title = title;
    if (subject !== undefined) quiz.subject = subject;
    if (grade !== undefined) quiz.grade = grade;
    if (questions !== undefined) quiz.questions = questions;
    if (timeLimit !== undefined) quiz.timeLimit = timeLimit;
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update quiz status (admin approval only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can approve or reject quizzes' });
    }
    const quiz = await Quiz.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
