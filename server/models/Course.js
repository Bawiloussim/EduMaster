const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, required: true },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  coverImage: { type: String, default: '' },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  price: { type: Number, default: 0 },
  tags: [String],
  language: { type: String, default: 'fr' },
  estimatedDuration: { type: Number, default: 0 },
  modules: [moduleSchema],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  enrollmentCount: { type: Number, default: 0 },
}, { timestamps: true });

courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, status: 1, level: 1 });

module.exports = mongoose.model('Course', courseSchema);
