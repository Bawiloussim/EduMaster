const School = require('../models/School');
const User = require('../models/User');
const Course = require('../models/Course');
const Class = require('../models/Class');
const { getFileUrl } = require('../middlewares/upload');
const { schoolId: resolveSchoolId } = require('../utils/schoolAuth');

// ─── Public ──────────────────────────────────────────────────────────────────

// Used by the registration form's school picker — no auth, minimal fields only.
exports.publicList = async (req, res) => {
  const schools = await School.find({ status: 'active' }).select('name city').sort({ name: 1 }).lean();
  res.json({ success: true, data: schools });
};

// ─── Principal (chef d'établissement): self-service school setup ───────────
// A principal creates and owns exactly one school, set up through the
// onboarding wizard — distinct from the superadmin CRUD below.

exports.getMySchool = async (req, res) => {
  const id = resolveSchoolId(req.user);
  if (!id) return res.json({ success: true, data: null });
  const school = await School.findById(id);
  res.json({ success: true, data: school });
};

exports.createMySchool = async (req, res) => {
  if (resolveSchoolId(req.user)) {
    return res.status(409).json({ success: false, message: 'Vous avez déjà un établissement' });
  }
  const { name, city, address, phone, email, currency } = req.body;
  if (!name) return res.status(422).json({ success: false, message: "Le nom de l'établissement est requis" });

  const school = await School.create({ name, city, address, phone, email, currency });
  await User.findByIdAndUpdate(req.user._id, { school: school._id });
  res.status(201).json({ success: true, data: school });
};

exports.updateMySchool = async (req, res) => {
  const id = resolveSchoolId(req.user);
  if (!id) return res.status(404).json({ success: false, message: "Aucun établissement à modifier" });

  const fields = ['name', 'city', 'address', 'phone', 'email', 'currency', 'academicYearLabel', 'academicYearStart', 'academicYearEnd'];
  const updates = {};
  fields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const school = await School.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  if (!school) return res.status(404).json({ success: false, message: 'Établissement introuvable' });
  res.json({ success: true, data: school });
};

exports.uploadMySchoolLogo = async (req, res) => {
  const id = resolveSchoolId(req.user);
  if (!id) return res.status(404).json({ success: false, message: "Aucun établissement à modifier" });
  if (!req.file) return res.status(422).json({ success: false, message: 'Fichier requis' });

  const school = await School.findByIdAndUpdate(id, { logo: getFileUrl(req.file) }, { new: true });
  res.json({ success: true, data: school });
};

// Live counts, never a stored flag — the onboarding checklist derives its
// "done" state straight from real data, so it can't drift out of sync.
exports.getSetupStatus = async (req, res) => {
  const id = resolveSchoolId(req.user);
  if (!id) return res.json({ success: true, data: { hasSchool: false } });

  const school = await School.findById(id).select('academicYearLabel').lean();
  const [classesCount, coursesCount, teachersCount, studentsCount, coAdminsCount] = await Promise.all([
    Class.countDocuments({ school: id }),
    Course.countDocuments({ school: id }),
    User.countDocuments({ school: id, role: 'instructor' }),
    User.countDocuments({ school: id, role: 'student' }),
    User.countDocuments({ school: id, role: 'admin', _id: { $ne: req.user._id } }),
  ]);

  res.json({
    success: true,
    data: {
      hasSchool: true,
      hasAcademicYear: !!school?.academicYearLabel,
      classesCount, coursesCount, teachersCount, studentsCount, coAdminsCount,
    },
  });
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
