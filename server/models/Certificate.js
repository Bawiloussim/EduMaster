const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  result: { type: mongoose.Schema.Types.ObjectId, ref: 'Result', required: true },
  uniqueId: { type: String, required: true, unique: true },
  verifyHash: { type: String, required: true, unique: true },
  issuedAt: { type: Date, default: Date.now },
  pdfUrl: { type: String, default: '' },
}, { timestamps: true });

certificateSchema.index({ student: 1, course: 1 });
certificateSchema.index({ verifyHash: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
