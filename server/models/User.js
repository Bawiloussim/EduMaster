const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { CLASSES, SERIES } = require('../constants/academic');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['superadmin', 'admin', 'instructor', 'student'], default: 'student' },
  // null only for superadmin — every other role belongs to exactly one school
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  // 'pending'/'rejected' only ever apply to role 'admin' (chef d'établissement approval flow)
  status: { type: String, enum: ['active', 'pending', 'rejected'], default: 'active' },
  classe: { type: String, enum: [...CLASSES, null], default: null },
  serie: { type: String, enum: [...SERIES, null], default: null },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  refreshToken: { type: String, select: false },
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
