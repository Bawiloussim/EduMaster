const crypto = require('crypto');
const User = require('../models/User');
const Course = require('../models/Course');
const Class = require('../models/Class');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const emailService = require('../services/emailService');
const { syncClassEnrollments } = require('./enrollmentController');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared by manual create/update for both roles — validates classe/serie
// against the school's own Class documents (only meaningful for students;
// instructors don't carry a classe/serie).
async function validateClasse(schoolId, classe, serie) {
  if (!classe) return null;
  if (!CLASSES.includes(classe)) return 'Classe invalide';
  const finalSerie = requiresSerie(classe) ? serie : null;
  if (requiresSerie(classe) && !SERIES.includes(finalSerie)) return 'Série invalide';
  const exists = await Class.findOne({ school: schoolId, classe, serie: finalSerie });
  if (!exists) return "Cette classe n'existe pas encore pour votre établissement";
  return null;
}

// ─── Users (moved here from notificationController) ───────────────────────

exports.adminList = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(req.schoolFilter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(req.schoolFilter),
  ]);
  res.json({ success: true, data: users, total });
};

// Only a superadmin may change a user's role — everyone else keeps the role
// they registered (or were imported) with.
exports.updateUserRole = async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const { role } = req.body;
  const assignableRoles = ['student', 'instructor', 'admin', 'superadmin'];

  if (!assignableRoles.includes(role)) {
    return res.status(422).json({ success: false, message: 'Rôle invalide' });
  }

  const existing = await User.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).lean();
  res.json({ success: true, data: user });
};

// ─── Instructors overview ───────────────────────────────────────────────────

exports.listInstructors = async (req, res) => {
  const instructors = await User.find({ ...req.schoolFilter, role: 'instructor' })
    .select('name email avatar status assignedClasses subjects createdAt')
    .populate('assignedClasses', 'classe serie').lean();

  const data = await Promise.all(instructors.map(async (instructor) => {
    const courses = await Course.find({ instructor: instructor._id }).select('_id').lean();
    const courseIds = courses.map((c) => c._id);

    const [enrollments, exams] = await Promise.all([
      courseIds.length ? Enrollment.find({ course: { $in: courseIds } }).lean() : [],
      courseIds.length ? Exam.find({ course: { $in: courseIds } }).select('_id').lean() : [],
    ]);

    const examIds = exams.map((e) => e._id);
    const results = examIds.length ? await Result.find({ exam: { $in: examIds }, status: 'graded' }).lean() : [];
    const avgPassRate = results.length
      ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
      : 0;

    return {
      ...instructor,
      coursesCount: courses.length,
      studentsCount: new Set(enrollments.map((e) => e.student.toString())).size,
      avgPassRate,
    };
  }));

  res.json({ success: true, data });
};

// ─── Students overview ───────────────────────────────────────────────────────

exports.listStudents = async (req, res) => {
  const students = await User.find({ ...req.schoolFilter, role: 'student' })
    .select('name email avatar classe serie status matricule phone gender birthDate createdAt').lean();

  const data = await Promise.all(students.map(async (student) => {
    const enrollments = await Enrollment.find({ student: student._id }).lean();
    const avgProgress = enrollments.length
      ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
      : 0;

    return {
      ...student,
      coursesCount: enrollments.length,
      avgProgress,
    };
  }));

  res.json({ success: true, data });
};

// ─── Students CRUD ───────────────────────────────────────────────────────────

exports.createStudent = async (req, res) => {
  const { name, email, password, classe, serie, matricule, phone, gender, birthDate } = req.body;
  if (!name || !email) return res.status(422).json({ success: false, message: 'Nom et email requis' });
  if (!EMAIL_RE.test(email)) return res.status(422).json({ success: false, message: 'Email invalide' });

  const schoolId = req.schoolFilter.school;
  const classeError = await validateClasse(schoolId, classe, serie);
  if (classeError) return res.status(422).json({ success: false, message: classeError });

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });

  const finalSerie = classe && requiresSerie(classe) ? serie : null;
  const tempPassword = password || crypto.randomBytes(6).toString('base64url');
  const user = await User.create({
    name, email, password: tempPassword, role: 'student', school: schoolId,
    classe: classe || null, serie: finalSerie,
    matricule: matricule || '', phone: phone || '', gender: gender || null,
    birthDate: birthDate || null, emailVerified: true,
  });

  if (classe) {
    await syncClassEnrollments(user._id, schoolId, classe, finalSerie);
  }
  emailService.sendStudentImported(user, tempPassword).catch(() => {});

  res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, classe: user.classe, serie: user.serie, tempPassword: password ? undefined : tempPassword } });
};

exports.updateStudent = async (req, res) => {
  const schoolId = req.schoolFilter.school;
  const student = await User.findOne({ _id: req.params.id, role: 'student', school: schoolId });
  if (!student) return res.status(404).json({ success: false, message: 'Élève introuvable' });

  const { name, email, classe, serie, matricule, phone, gender, birthDate } = req.body;

  if (email && email.toLowerCase() !== student.email) {
    if (!EMAIL_RE.test(email)) return res.status(422).json({ success: false, message: 'Email invalide' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    student.email = email;
  }

  if (classe !== undefined && classe !== student.classe) {
    const classeError = await validateClasse(schoolId, classe, serie);
    if (classeError) return res.status(422).json({ success: false, message: classeError });
    const finalSerie = classe && requiresSerie(classe) ? serie : null;
    student.classe = classe || null;
    student.serie = finalSerie;
    if (classe) {
      await syncClassEnrollments(student._id, schoolId, classe, finalSerie);
    }
  }

  if (name) student.name = name;
  if (matricule !== undefined) student.matricule = matricule;
  if (phone !== undefined) student.phone = phone;
  if (gender !== undefined) student.gender = gender || null;
  if (birthDate !== undefined) student.birthDate = birthDate || null;

  await student.save();
  res.json({ success: true, data: student });
};

exports.deleteStudent = async (req, res) => {
  const student = await User.findOneAndDelete({ _id: req.params.id, role: 'student', school: req.schoolFilter.school });
  if (!student) return res.status(404).json({ success: false, message: 'Élève introuvable' });
  res.json({ success: true, message: 'Élève supprimé' });
};

exports.resetStudentPassword = async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student', school: req.schoolFilter.school });
  if (!student) return res.status(404).json({ success: false, message: 'Élève introuvable' });

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  student.password = tempPassword;
  await student.save();
  emailService.sendPasswordResetByAdmin(student, tempPassword).catch(() => {});

  res.json({ success: true, data: { tempPassword } });
};

exports.toggleStudentStatus = async (req, res) => {
  const student = await User.findOne({ _id: req.params.id, role: 'student', school: req.schoolFilter.school });
  if (!student) return res.status(404).json({ success: false, message: 'Élève introuvable' });
  student.status = student.status === 'suspended' ? 'active' : 'suspended';
  await student.save();
  res.json({ success: true, data: { status: student.status } });
};

// ─── Instructors CRUD ────────────────────────────────────────────────────────

exports.createInstructor = async (req, res) => {
  const { name, email, password, subjects } = req.body;
  if (!name || !email) return res.status(422).json({ success: false, message: 'Nom et email requis' });
  if (!EMAIL_RE.test(email)) return res.status(422).json({ success: false, message: 'Email invalide' });

  const schoolId = req.schoolFilter.school;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });

  const tempPassword = password || crypto.randomBytes(6).toString('base64url');
  const user = await User.create({
    name, email, password: tempPassword, role: 'instructor', school: schoolId,
    subjects: Array.isArray(subjects) ? subjects : [], emailVerified: true,
  });
  emailService.sendStudentImported(user, tempPassword).catch(() => {});

  res.status(201).json({ success: true, data: { _id: user._id, name: user.name, email: user.email, tempPassword: password ? undefined : tempPassword } });
};

exports.updateInstructor = async (req, res) => {
  const instructor = await User.findOne({ _id: req.params.id, role: 'instructor', school: req.schoolFilter.school });
  if (!instructor) return res.status(404).json({ success: false, message: 'Formateur introuvable' });

  const { name, email } = req.body;
  if (email && email.toLowerCase() !== instructor.email) {
    if (!EMAIL_RE.test(email)) return res.status(422).json({ success: false, message: 'Email invalide' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    instructor.email = email;
  }
  if (name) instructor.name = name;

  await instructor.save();
  res.json({ success: true, data: instructor });
};

exports.deleteInstructor = async (req, res) => {
  const instructor = await User.findOneAndDelete({ _id: req.params.id, role: 'instructor', school: req.schoolFilter.school });
  if (!instructor) return res.status(404).json({ success: false, message: 'Formateur introuvable' });
  res.json({ success: true, message: 'Formateur supprimé' });
};

exports.resetInstructorPassword = async (req, res) => {
  const instructor = await User.findOne({ _id: req.params.id, role: 'instructor', school: req.schoolFilter.school });
  if (!instructor) return res.status(404).json({ success: false, message: 'Formateur introuvable' });

  const tempPassword = crypto.randomBytes(6).toString('base64url');
  instructor.password = tempPassword;
  await instructor.save();
  emailService.sendPasswordResetByAdmin(instructor, tempPassword).catch(() => {});

  res.json({ success: true, data: { tempPassword } });
};

exports.toggleInstructorStatus = async (req, res) => {
  const instructor = await User.findOne({ _id: req.params.id, role: 'instructor', school: req.schoolFilter.school });
  if (!instructor) return res.status(404).json({ success: false, message: 'Formateur introuvable' });
  instructor.status = instructor.status === 'suspended' ? 'active' : 'suspended';
  await instructor.save();
  res.json({ success: true, data: { status: instructor.status } });
};

exports.updateInstructorAssignments = async (req, res) => {
  const instructor = await User.findOne({ _id: req.params.id, role: 'instructor', school: req.schoolFilter.school });
  if (!instructor) return res.status(404).json({ success: false, message: 'Formateur introuvable' });

  const { assignedClasses, subjects } = req.body;
  if (Array.isArray(assignedClasses)) {
    const validClasses = await Class.find({ _id: { $in: assignedClasses }, school: req.schoolFilter.school }).select('_id').lean();
    instructor.assignedClasses = validClasses.map((c) => c._id);
  }
  if (Array.isArray(subjects)) instructor.subjects = subjects;

  await instructor.save();
  const populated = await instructor.populate('assignedClasses', 'classe serie');
  res.json({ success: true, data: populated });
};

// ─── Classes overview ────────────────────────────────────────────────────────

exports.classesOverview = async (req, res) => {
  const combos = CLASSES.flatMap((classe) => requiresSerie(classe)
    ? SERIES.map((serie) => ({ classe, serie }))
    : [{ classe, serie: null }]);

  const data = await Promise.all(combos.map(async ({ classe, serie }) => {
    const [studentsCount, coursesCount] = await Promise.all([
      User.countDocuments({ ...req.schoolFilter, role: 'student', classe, ...(serie ? { serie } : {}) }),
      Course.countDocuments({ ...req.schoolFilter, classe, ...(serie ? { serie } : {}) }),
    ]);
    return { classe, serie, studentsCount, coursesCount };
  }));

  res.json({ success: true, data });
};
