const School = require('../models/School');
const User = require('../models/User');
const Course = require('../models/Course');
const emailService = require('../services/emailService');

// ─── Public ──────────────────────────────────────────────────────────────────

// Used by the registration form's school picker — no auth, minimal fields only.
exports.publicList = async (req, res) => {
  const schools = await School.find({ status: 'active' }).select('name city').sort({ name: 1 }).lean();
  res.json({ success: true, data: schools });
};

// ─── SuperAdmin: schools CRUD ────────────────────────────────────────────────

exports.list = async (req, res) => {
  const schools = await School.find().sort({ createdAt: -1 }).lean();
  const data = await Promise.all(schools.map(async (school) => {
    const [usersCount, coursesCount] = await Promise.all([
      User.countDocuments({ school: school._id }),
      Course.countDocuments({ school: school._id }),
    ]);
    return { ...school, usersCount, coursesCount };
  }));
  res.json({ success: true, data });
};

exports.create = async (req, res) => {
  const { name, city } = req.body;
  if (!name) return res.status(422).json({ success: false, message: "Le nom de l'établissement est requis" });
  const school = await School.create({ name, city });
  res.status(201).json({ success: true, data: school });
};

exports.update = async (req, res) => {
  const { name, city } = req.body;
  const school = await School.findByIdAndUpdate(req.params.id, { name, city }, { new: true, runValidators: true });
  if (!school) return res.status(404).json({ success: false, message: 'Établissement introuvable' });
  res.json({ success: true, data: school });
};

exports.setStatus = async (req, res) => {
  const { status } = req.body;
  if (!['active', 'suspended'].includes(status)) {
    return res.status(422).json({ success: false, message: 'Statut invalide' });
  }
  const school = await School.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!school) return res.status(404).json({ success: false, message: 'Établissement introuvable' });
  res.json({ success: true, data: school });
};

exports.remove = async (req, res) => {
  const usersCount = await User.countDocuments({ school: req.params.id });
  if (usersCount > 0) {
    return res.status(409).json({ success: false, message: 'Impossible de supprimer un établissement qui a encore des utilisateurs' });
  }
  const school = await School.findByIdAndDelete(req.params.id);
  if (!school) return res.status(404).json({ success: false, message: 'Établissement introuvable' });
  res.json({ success: true, message: 'Établissement supprimé' });
};

// ─── SuperAdmin: chef d'établissement approval queue ─────────────────────────

exports.pendingPrincipals = async (req, res) => {
  const principals = await User.find({ role: 'admin', status: 'pending' })
    .populate('school', 'name city')
    .select('name email school createdAt')
    .sort({ createdAt: 1 })
    .lean();
  res.json({ success: true, data: principals });
};

exports.approvePrincipal = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!user) return res.status(404).json({ success: false, message: 'Demande introuvable' });
  user.status = 'active';
  await user.save({ validateBeforeSave: false });
  await emailService.sendPrincipalApproved(user).catch(() => {});
  res.json({ success: true, data: user });
};

exports.rejectPrincipal = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'admin' });
  if (!user) return res.status(404).json({ success: false, message: 'Demande introuvable' });
  user.status = 'rejected';
  await user.save({ validateBeforeSave: false });
  await emailService.sendPrincipalRejected(user).catch(() => {});
  res.json({ success: true, data: user });
};
