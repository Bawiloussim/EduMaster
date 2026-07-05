const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  duration: { type: Number, required: true, min: 1 },
  passingScore: { type: Number, required: true, min: 0, max: 100 },
  maxAttempts: { type: Number, default: 3 },
  questionCount: { type: Number, default: 0 },
  isRandomized: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
