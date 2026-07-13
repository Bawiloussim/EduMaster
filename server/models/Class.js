const mongoose = require('mongoose');
const { CLASSES, SERIES } = require('../constants/academic');

// A school's own "class group" (e.g. "Terminale D" at this specific school) —
// administrative metadata layered on top of the existing classe/serie enum.
// Course targeting, enrollment sync, evaluations and bulletins all keep
// matching on User.classe/serie directly and never reference this model.
const classSchema = new mongoose.Schema({
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  classe: { type: String, enum: CLASSES, required: true },
  serie: { type: String, enum: [...SERIES, null], default: null },
  mainTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

classSchema.index({ school: 1, classe: 1, serie: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
