const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Result = require('../models/Result');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const Exam = require('../models/Exam');

exports.student = async (req, res) => {
  const [enrollments, results, certificates] = await Promise.all([
    Enrollment.find({ student: req.user._id }).populate('course', 'title coverImage').lean(),
    Result.find({ student: req.user._id }).populate('exam', 'title passingScore').sort({ createdAt: -1 }).limit(10).lean(),
    Certificate.find({ student: req.user._id }).populate('course', 'title').lean(),
  ]);

  res.json({
    success: true,
    data: {
      enrollmentsCount: enrollments.length,
      completedCourses: enrollments.filter((e) => e.progress === 100).length,
      certificatesCount: certificates.length,
      avgProgress: enrollments.length
        ? Math.round(enrollments.reduce((s, e) => s + e.progress, 0) / enrollments.length)
        : 0,
      recentResults: results,
      enrollments,
      certificates,
    },
  });
};

exports.instructor = async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id }).lean();
  const courseIds = courses.map((c) => c._id);

  const [enrollments, exams] = await Promise.all([
    Enrollment.find({ course: { $in: courseIds } }).lean(),
    Exam.find({ course: { $in: courseIds } }).lean(),
  ]);

  const examIds = exams.map((e) => e._id);
  const results = await Result.find({ exam: { $in: examIds } }).lean();
  const pendingGrading = results.filter((r) => r.needsManualGrading && r.status === 'submitted');

  const courseStats = await Promise.all(courses.map(async (course) => {
    const courseEnrollments = enrollments.filter((e) => e.course.toString() === course._id.toString());
    const avgProgress = courseEnrollments.length
      ? Math.round(courseEnrollments.reduce((s, e) => s + e.progress, 0) / courseEnrollments.length)
      : 0;
    return { ...course, enrollmentsCount: courseEnrollments.length, avgProgress };
  }));

  res.json({
    success: true,
    data: {
      coursesCount: courses.length,
      totalStudents: new Set(enrollments.map((e) => e.student.toString())).size,
      totalEnrollments: enrollments.length,
      pendingGradingCount: pendingGrading.length,
      avgPassRate: results.filter((r) => r.status === 'graded').length
        ? Math.round(results.filter((r) => r.passed).length / results.filter((r) => r.status === 'graded').length * 100)
        : 0,
      courses: courseStats,
      pendingGrading,
    },
  });
};

exports.admin = async (req, res) => {
  const [usersCount, coursesCount, enrollmentsCount, resultsCount] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Enrollment.countDocuments(),
    Result.countDocuments({ status: 'graded' }),
  ]);

  const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).lean();
  const popularCourses = await Course.find({ status: 'published' }).sort({ enrollmentCount: -1 }).limit(5).populate('instructor', 'name').lean();

  res.json({
    success: true,
    data: { usersCount, coursesCount, enrollmentsCount, resultsCount, recentUsers, popularCourses },
  });
};
