const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  statement: { type: String, required: true },      // énoncé
  type: { type: String, enum: ['open', 'qcm'], default: 'open' },
  options: [String],                                 // choix QCM
  correctOption: { type: Number, default: null },    // index réponse correcte (QCM)
  order: { type: Number, default: 0 },
}, { timestamps: true });

exerciseSchema.index({ lesson: 1, order: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
