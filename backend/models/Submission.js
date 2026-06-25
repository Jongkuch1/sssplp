const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: String,
  fileUrl: String,
  submittedAt: { type: Date, default: Date.now },
  grade: Number,
  comments: String,
  status: { type: String, enum: ['submitted', 'graded'], default: 'submitted' },
  gradedAt: Date
});

module.exports = mongoose.model('Submission', submissionSchema);
