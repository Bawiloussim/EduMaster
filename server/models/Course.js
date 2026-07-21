const mongoose = require('mongoose');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  order: { type: Number, default: 0 },
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  subject: { type: String, required: true },
  classe: { type: String, enum: CLASSES, required: true },
  serie: { type: String, enum: [...SERIES, null], default: null, required: function () { return requiresSerie(this.classe); } },
  coverImage: { type: String, default: '' },
  // The official curriculum PDF a formateur imported to auto-fill this course's
  // modules — kept around (unlike the ephemeral extraction step itself) so any
  // instructor in the school can download the source document later.
  programmePdf: {
    url: { type: String, default: '' },
    name: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },
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
courseSchema.index({ classe: 1, serie: 1, status: 1 });
courseSchema.index({ school: 1 });

module.exports = mongoose.model('Course', courseSchema);
