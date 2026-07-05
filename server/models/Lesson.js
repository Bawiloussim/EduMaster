const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true, trim: true },
  type: { type: String, enum: ['video', 'pdf', 'text', 'exercise'], required: true },
  contentUrl: { type: String, default: '' },
  content: { type: String, default: '' },
  order: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  isFreePreview: { type: Boolean, default: false },
}, { timestamps: true });

lessonSchema.index({ course: 1, moduleId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
