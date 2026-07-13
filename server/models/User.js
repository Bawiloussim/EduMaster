const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { CLASSES, SERIES } = require('../constants/academic');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  // Not required for Google accounts (no local password to check)
  password: { type: String, required: function () { return !this.googleId; }, select: false },
  // No `default: null` — a sparse unique index only excludes documents where
  // the field is genuinely absent, not ones explicitly set to null, so
  // defaulting it would collide every non-Google account into one index entry.
  googleId: { type: String, unique: true, sparse: true },
  role: { type: String, enum: ['superadmin', 'admin', 'instructor', 'student'], default: 'student' },
  // null only for superadmin — every other role belongs to exactly one school
  school: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  // 'pending'/'rejected' only ever apply to role 'admin' (chef d'établissement approval flow);
  // 'suspended' is a chef d'établissement disabling a student/instructor account — same login gate.
  status: { type: String, enum: ['active', 'pending', 'rejected', 'suspended'], default: 'active' },
  classe: { type: String, enum: [...CLASSES, null], default: null },
  serie: { type: String, enum: [...SERIES, null], default: null },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  matricule: { type: String, default: '', trim: true },
  phone: { type: String, default: '', trim: true },
  gender: { type: String, enum: ['M', 'F', null], default: null },
  birthDate: { type: Date, default: null },
  // Instructor-only, informational (doesn't gate course creation)
  assignedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Class' }],
  subjects: [String],
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
  if (!this.password) return false; // Google-only account, no local password
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
