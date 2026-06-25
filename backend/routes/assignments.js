const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const auth = require('../middleware/auth');

// Get assignments (approved by default; ?mine=true for a teacher's own; ?status=X for admin review queue)
router.get('/', auth, async (req, res) => {
  try {
    let filter = { status: 'approved' };
    if (req.query.mine === 'true') {
      filter = { teacherId: req.user.id };
    } else if (req.query.status && req.user.role === 'admin') {
      filter = { status: req.query.status };
    }
    const assignments = await Assignment.find(filter).populate('teacherId', 'name');
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create assignment
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers and administrators can create assignments' });
    }
    const assignment = new Assignment({ ...req.body, teacherId: req.user.id });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Edit an assignment (owning teacher or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    if (assignment.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own assignments' });
    }
    const { title, subject, grade, description, dueDate, questions } = req.body;
    if (title !== undefined) assignment.title = title;
    if (subject !== undefined) assignment.subject = subject;
    if (grade !== undefined) assignment.grade = grade;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate;
    if (questions !== undefined) assignment.questions = questions;
    await assignment.save();
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update assignment status (admin approval only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can approve or reject assignments' });
    }
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
