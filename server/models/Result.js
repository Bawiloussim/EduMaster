const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  answer: mongoose.Schema.Types.Mixed,
  isCorrect: { type: Boolean, default: null },
  pointsEarned: { type: Number, default: 0 },
  instructorScore: { type: Number, default: null },
  instructorComment: { type: String, default: '' },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  answers: [answerSchema],
  score: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  startedAt: { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  attemptNumber: { type: Number, required: true },
  focusLostCount: { type: Number, default: 0 },
  status: { type: String, enum: ['in_progress', 'submitted', 'graded'], default: 'in_progress' },
  needsManualGrading: { type: Boolean, default: false },
}, { timestamps: true });

resultSchema.index({ student: 1, exam: 1 });

module.exports = mongoose.model('Result', resultSchema);
