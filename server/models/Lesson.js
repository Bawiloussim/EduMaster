const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, default: null },
  title: { type: String, required: true, trim: true },
  // Multiple content types can coexist on the same lesson
  videoUrl: { type: String, default: '' },
  pdfUrls: [{
    url: { type: String, required: true },
    name: { type: String, default: '' },
    // Cloudinary public_id — lets the server fetch the file via a signed,
    // authenticated URL instead of the public CDN link (see lessonController.streamPdf).
    publicId: { type: String, default: '' },
  }],
  content:  { type: String, default: '' },  // text / markdown
  order: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  isFreePreview: { type: Boolean, default: false },
}, { timestamps: true });

lessonSchema.index({ course: 1, moduleId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
