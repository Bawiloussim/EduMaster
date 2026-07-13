const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  city: { type: String, default: '', trim: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  logo: { type: String, default: '' },
  address: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  currency: { type: String, default: 'XAF', trim: true },
  // Scalars, not a separate collection — no other model tracks history across years yet (v1 scope).
  academicYearLabel: { type: String, default: '', trim: true },
  academicYearStart: { type: Date, default: null },
  academicYearEnd: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('School', schoolSchema);
