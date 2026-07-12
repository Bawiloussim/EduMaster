const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Notification = require('../models/Notification');
const User = require('../models/User');
const certificateService = require('../services/certificateService');
const { requiresSerie } = require('../constants/academic');
const { canManageCourse, schoolId } = require('../utils/schoolAuth');

// Enroll a student in every published course matching their school/classe/serie
// (called when a student picks their classe, and covers courses that already exist)
exports.syncClassEnrollments = async (studentId, school, classe, serie) => {
  if (!classe || !school) return;
  if (requiresSerie(classe) && !serie) return;
  const filter = { status: 'published', school, classe };
  if (requiresSerie(classe)) filter.serie = serie;
  const courses = await Course.find(filter).select('_id').lean();
  await Promise.all(courses.map(async (course) => {
    const existing = await Enrollment.findOne({ student: studentId, course: course._id });
    if (existing) return;
    await Enrollment.create({ student: studentId, course: course._id });
    await Course.findByIdAndUpdate(course._id, { $inc: { enrollmentCount: 1 } });
  }));
};

// Enroll every student of the course's school/classe/serie when it's published
// (called when an instructor publishes a course, so existing students of that class get it too)
exports.syncCourseEnrollments = async (course) => {
  if (course.status !== 'published') return;
  const filter = { role: 'student', school: course.school, classe: course.classe };
  if (requiresSerie(course.classe)) filter.serie = course.serie;
  const students = await User.find(filter).select('_id').lean();
  await Promise.all(students.map(async (student) => {
    const existing = await Enrollment.findOne({ student: student._id, course: course._id });
    if (existing) return;
    await Enrollment.create({ student: student._id, course: course._id });
    await Course.findByIdAndUpdate(course._id, { $inc: { enrollmentCount: 1 } });
  }));
};

exports.enroll = async (req, res) => {
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course || course.status !== 'published' || course.school.toString() !== schoolId(req.user)) {
    return res.status(404).json({ success: false, message: 'Cours introuvable ou non publié' });
  }

  const existing = await Enrollment.findOne({ student: req.user._id, course: courseId });
  if (existing) return res.status(409).json({ success: false, message: 'Déjà inscrit' });

  const enrollment = await Enrollment.create({ student: req.user._id, course: courseId });
  await Course.findByIdAndUpdate(courseId, { $inc: { enrollmentCount: 1 } });

  await Notification.create({
    user: req.user._id,
    type: 'enrollment',
    title: 'Inscription confirmée',
    message: `Vous êtes inscrit au cours "${course.title}"`,
    link: `/courses/${courseId}`,
  });

  res.status(201).json({ success: true, data: enrollment });
};

exports.myEnrollments = async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({ path: 'course', populate: { path: 'instructor', select: 'name avatar' } })
    .sort({ enrolledAt: -1 })
    .lean();
  res.json({ success: true, data: enrollments });
};

// Instructor: every student enrolled in one of their courses
exports.listForCourse = async (req, res) => {
  const course = await Course.findById(req.query.course);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const enrollments = await Enrollment.find({ course: course._id })
    .populate('student', 'name email avatar')
    .sort({ enrolledAt: 1 })
    .lean();
  res.json({ success: true, data: enrollments });
};

exports.markLesson = async (req, res) => {
  const { lessonId } = req.body;
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment || enrollment.student.toString() !== req.user._id.toString()) {
    return res.status(404).json({ success: false, message: 'Inscription introuvable' });
  }

  if (!enrollment.completedLessons.map(String).includes(lessonId)) {
    enrollment.completedLessons.push(lessonId);
  }
  enrollment.lastLessonId = lessonId;

  const totalLessons = await Lesson.countDocuments({ course: enrollment.course });
  enrollment.progress = totalLessons > 0
    ? Math.round((enrollment.completedLessons.length / totalLessons) * 100)
    : 0;

  const justCompleted = enrollment.progress === 100 && !enrollment.completedAt;
  if (justCompleted) {
    enrollment.completedAt = new Date();
  }

  await enrollment.save();

  // Auto-generate completion attestation when course is finished
  if (justCompleted) {
    try {
      const course = await Course.findById(enrollment.course);
      await certificateService.generateCompletion(enrollment.student, course);
      await Notification.create({
        user: enrollment.student,
        type: 'certificate_ready',
        title: 'Attestation disponible !',
        message: `Vous avez terminé le cours "${course.title}". Votre attestation est prête.`,
        link: `/student`,
      });
    } catch (e) {
      console.error('Attestation generation error:', e.message);
    }
  }

  res.json({ success: true, data: enrollment, attestationGenerated: justCompleted });
};

exports.getEnrollment = async (req, res) => {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.courseId }).lean();
  if (!enrollment) return res.status(404).json({ success: false, message: 'Non inscrit' });
  res.json({ success: true, data: enrollment });
};
