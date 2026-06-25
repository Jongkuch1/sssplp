const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  details: mongoose.Schema.Types.Mixed,
  userEmail: String,
  timestamp: { type: Date, default: Date.now },
  ip: String
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
