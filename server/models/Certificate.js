const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course:  { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  // For exam-based certificates (legacy)
  exam:    { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', default: null },
  result:  { type: mongoose.Schema.Types.ObjectId, ref: 'Result', default: null },
  // 'completion' = finished all lessons, 'exam' = passed an exam
  type:    { type: String, enum: ['completion', 'exam'], default: 'completion' },
  uniqueId:    { type: String, required: true },
  verifyHash:  { type: String, required: true },
  issuedAt:    { type: Date, default: Date.now },
  pdfUrl:      { type: String, default: '' },
}, { timestamps: true });

certificateSchema.index({ student: 1, course: 1, type: 1 });
certificateSchema.index({ verifyHash: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
