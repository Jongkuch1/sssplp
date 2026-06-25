const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Record an audit log entry
router.post('/', auth, async (req, res) => {
  try {
    const { action, details } = req.body;
    const actingUser = await User.findById(req.user.id).select('email');
    const log = await AuditLog.create({
      action,
      details,
      userEmail: actingUser?.email,
      ip: req.ip
    });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// List audit logs (admin only)
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only administrators can view audit logs' });
    }
    const filter = {};
    if (req.query.action) filter.action = req.query.action;
    if (req.query.user) filter.userEmail = req.query.user;
    if (req.query.startDate) filter.timestamp = { $gte: new Date(Number(req.query.startDate)) };

    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(1000);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
