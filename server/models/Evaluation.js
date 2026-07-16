const mongoose = require('mongoose');

// Coefficients Cameroun : interro ×1, devoir ×2, composition ×3
const COEFFICIENTS = { interrogation: 1, devoir: 2, composition: 3 };

const evaluationSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  trimestre: { type: Number, enum: [1, 2, 3], required: true },
  type: { type: String, enum: ['interrogation', 'devoir', 'composition'], required: true },
  sequence: { type: Number, default: 1 },  // 1 ou 2 pour les interrogations
  title: { type: String, default: '' },
  date: { type: Date, default: null },
  maxScore: { type: Number, default: 20 },
  subjectUrl: { type: String, default: '' },  // PDF du sujet uploadé par le prof — l'élève doit le consulter avant d'envoyer sa copie
  subjectName: { type: String, default: '' },
  correctionUrl: { type: String, default: '' },  // PDF corrigé uploadé par le prof
  isGraded: { type: Boolean, default: false },
  signed: { type: Boolean, default: false },
  signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  signedAt: { type: Date, default: null },
}, { timestamps: true });

evaluationSchema.virtual('coefficient').get(function () {
  return COEFFICIENTS[this.type] || 1;
});

evaluationSchema.set('toJSON', { virtuals: true });
evaluationSchema.index({ course: 1, trimestre: 1, type: 1 });

module.exports = mongoose.model('Evaluation', evaluationSchema);
