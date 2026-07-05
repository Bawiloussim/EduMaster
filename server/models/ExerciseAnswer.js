const mongoose = require('mongoose');

const exerciseAnswerSchema = new mongoose.Schema({
  exercise: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answer: { type: String, default: '' },
  isCorrect: { type: Boolean, default: null },   // auto pour QCM
  grade: { type: Number, default: null },         // /10, pour open (saisi par prof)
  feedback: { type: String, default: '' },
  gradedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  gradedAt: { type: Date, default: null },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

exerciseAnswerSchema.index({ exercise: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('ExerciseAnswer', exerciseAnswerSchema);
