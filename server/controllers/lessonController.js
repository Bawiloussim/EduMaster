const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { getFileUrl, useCloudinary } = require('../middlewares/upload');
const { canManageCourse, isColleagueInstructor } = require('../utils/schoolAuth');
const { streamPdf } = require('../utils/pdfProxy');

const checkOwner = async (lessonId, user) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return { lesson: null, error: 'Leçon introuvable' };
  const course = await Course.findById(lesson.course);
  if (!course) return { lesson: null, error: 'Cours introuvable' };
  if (!canManageCourse(course, user)) {
    return { lesson: null, error: 'Accès interdit' };
  }
  return { lesson, course };
};

exports.create = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { title, moduleId, order, duration, isFreePreview, content, videoUrl } = req.body;
  const lesson = await Lesson.create({
    course: course._id,
    moduleId: moduleId || null,
    title,
    order: order || 0,
    duration: duration || 0,
    isFreePreview: isFreePreview === 'true' || isFreePreview === true,
    content: content || '',
    videoUrl: videoUrl || '',
  });
  res.status(201).json({ success: true, data: lesson });
};

exports.update = async (req, res) => {
  const { lesson, error } = await checkOwner(req.params.id, req.user);
  if (error) return res.status(404).json({ success: false, message: error });

  const allowed = ['title', 'order', 'duration', 'isFreePreview', 'content', 'videoUrl', 'moduleId'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) lesson[f] = req.body[f]; });

  // pdfUrls carries the surviving list (after any removals) — sent as a JSON
  // string in multipart requests, or a plain array in JSON requests.
  if (req.body.pdfUrls !== undefined) {
    lesson.pdfUrls = typeof req.body.pdfUrls === 'string' ? JSON.parse(req.body.pdfUrls) : req.body.pdfUrls;
  }
  // Newly uploaded PDF files are appended to whatever survived above
  if (req.files?.length) {
    const uploaded = req.files.map((f) => ({
      url: getFileUrl(f), name: f.originalname, publicId: useCloudinary ? f.filename : '',
    }));
    lesson.pdfUrls = [...(lesson.pdfUrls || []), ...uploaded];
  }

  await lesson.save();
  res.json({ success: true, data: lesson });
};

exports.delete = async (req, res) => {
  const { lesson, error } = await checkOwner(req.params.id, req.user);
  if (error) return res.status(404).json({ success: false, message: error });
  await lesson.deleteOne();
  res.json({ success: true, message: 'Leçon supprimée' });
};

exports.reorder = async (req, res) => {
  const { lessons } = req.body;
  await Promise.all(lessons.map(({ id, order }) => Lesson.findByIdAndUpdate(id, { order })));
  res.json({ success: true, message: 'Ordre mis à jour' });
};

// Streams a lesson PDF through our own server instead of the public Cloudinary
// CDN link — Cloudinary blocks/forces-download public PDF delivery by default,
// but an Admin-API signed download (authenticated with our API secret) isn't
// subject to that restriction, so this always works regardless of that setting.
exports.streamPdf = async (req, res) => {
  const lesson = await Lesson.findById(req.params.id);
  if (!lesson) return res.status(404).json({ success: false, message: 'Leçon introuvable' });
  const pdf = lesson.pdfUrls[req.params.index];
  if (!pdf) return res.status(404).json({ success: false, message: 'Document introuvable' });

  const course = await Course.findById(lesson.course);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });

  const hasAccess = lesson.isFreePreview || canManageCourse(course, req.user) ||
    isColleagueInstructor(course, req.user) ||
    !!(await Enrollment.findOne({ student: req.user._id, course: course._id }));
  if (!hasAccess) return res.status(403).json({ success: false, message: 'Accès interdit' });

  await streamPdf(res, pdf);
};
