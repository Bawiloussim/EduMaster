const mongoose = require('mongoose');
const { CLASSES, SERIES } = require('../constants/academic');

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  audience: { type: String, enum: ['all', 'students', 'instructors', 'classe'], default: 'all' },
  classe: { type: String, enum: [...CLASSES, null], default: null },
  serie: { type: String, enum: [...SERIES, null], default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);
