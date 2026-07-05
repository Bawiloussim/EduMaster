const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  evaluation: { type: mongoose.Schema.Types.ObjectId, ref: 'Evaluation', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  trimestre: { type: Number, enum: [1, 2, 3], required: true },
  score: { type: Number, default: null },   // note /maxScore
  absent: { type: Boolean, default: false },
  comment: { type: String, default: '' },
  gradedAt: { type: Date, default: Date.now },
}, { timestamps: true });

gradeSchema.index({ evaluation: 1, student: 1 }, { unique: true });
gradeSchema.index({ student: 1, course: 1, trimestre: 1 });

module.exports = mongoose.model('Grade', gradeSchema);
