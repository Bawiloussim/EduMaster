const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Notification = require('../models/Notification');

exports.enroll = async (req, res) => {
  const { courseId } = req.body;
  const course = await Course.findById(courseId);
  if (!course || course.status !== 'published') {
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

  if (enrollment.progress === 100 && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
  }

  await enrollment.save();
  res.json({ success: true, data: enrollment });
};

exports.getEnrollment = async (req, res) => {
  const enrollment = await Enrollment.findOne({ student: req.user._id, course: req.params.courseId }).lean();
  if (!enrollment) return res.status(404).json({ success: false, message: 'Non inscrit' });
  res.json({ success: true, data: enrollment });
};
