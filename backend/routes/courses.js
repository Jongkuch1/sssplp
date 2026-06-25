const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const auth = require('../middleware/auth');

// Get courses (approved by default; ?mine=true for a teacher's own; ?status=X for admin review queue)
router.get('/', auth, async (req, res) => {
  try {
    let filter = { status: 'approved' };
    if (req.query.mine === 'true') {
      filter = { teacherId: req.user.id };
    } else if (req.query.status && req.user.role === 'admin') {
      filter = { status: req.query.status };
    }
    const courses = await Course.find(filter).populate('teacherId', 'name');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create course
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only teachers and administrators can create courses' });
    }
    const course = new Course({ ...req.body, teacherId: req.user.id });
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Edit a course (owning teacher or admin)
router.put('/:id', auth, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    if (course.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own courses' });
    }
    const { title, subject, grade, description, modules } = req.body;
    if (title !== undefined) course.title = title;
    if (subject !== undefined) course.subject = subject;
    if (grade !== undefined) course.grade = grade;
    if (description !== undefined) course.description = description;
    if (modules !== undefined) course.modules = modules;
    await course.save();
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update course status (admin approval only)
router.put('/:id/status', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can approve or reject courses' });
    }
    const course = await Course.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
