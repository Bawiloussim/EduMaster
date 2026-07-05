const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  type: { type: String, enum: ['qcm', 'open', 'truefalse', 'multiple'], required: true },
  text: { type: String, required: true },
  options: [String],
  correctAnswers: [Number],
  explanation: { type: String, default: '' },
  points: { type: Number, default: 1 },
}, { timestamps: true });

questionSchema.index({ exam: 1 });

module.exports = mongoose.model('Question', questionSchema);
