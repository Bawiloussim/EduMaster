const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const { CLASSES, SERIES } = require('../constants/academic');

// ─── Users (moved here from notificationController) ───────────────────────

exports.adminList = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(),
  ]);
  res.json({ success: true, data: users, total });
};

exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  const isSuperAdmin = req.user.role === 'superadmin';
  const assignableRoles = isSuperAdmin
    ? ['student', 'instructor', 'admin', 'superadmin']
    : ['student', 'instructor']; // regular admins cannot grant admin/superadmin privileges

  if (!assignableRoles.includes(role)) {
    return res.status(422).json({ success: false, message: 'Rôle invalide' });
  }

  const existing = await User.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });

  // Only a superadmin may change another superadmin's role
  if (existing.role === 'superadmin' && !isSuperAdmin) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).lean();
  res.json({ success: true, data: user });
};

// ─── Instructors overview ───────────────────────────────────────────────────

exports.listInstructors = async (req, res) => {
  const instructors = await User.find({ role: 'instructor' }).select('name email avatar createdAt').lean();

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
  const students = await User.find({ role: 'student' }).select('name email avatar classe serie createdAt').lean();

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

// ─── Classes overview ────────────────────────────────────────────────────────

exports.classesOverview = async (req, res) => {
  const combos = CLASSES.flatMap((classe) => SERIES.map((serie) => ({ classe, serie })));

  const data = await Promise.all(combos.map(async ({ classe, serie }) => {
    const [studentsCount, coursesCount] = await Promise.all([
      User.countDocuments({ role: 'student', classe, serie }),
      Course.countDocuments({ classe, serie }),
    ]);
    return { classe, serie, studentsCount, coursesCount };
  }));

  res.json({ success: true, data });
};
