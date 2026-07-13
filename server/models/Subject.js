const mongoose = require('mongoose');

// A school's own catalogue of subject names — kept separate from Course.subject
// (still a free-text field there) purely so the wizard/dashboard can offer a
// consistent, autocompleted list instead of every teacher retyping "Maths".
const subjectSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, default: '', trim: true },
}, { timestamps: true });

subjectSchema.index({ school: 1, name: 1 }, { unique: true, collation: { locale: 'fr', strength: 2 } });

module.exports = mongoose.model('Subject', subjectSchema);
