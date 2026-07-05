const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { getFileUrl } = require('../middlewares/upload');

const checkOwner = async (lessonId, userId, userRole) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) return { lesson: null, error: 'Leçon introuvable' };
  const course = await Course.findById(lesson.course);
  if (!course) return { lesson: null, error: 'Cours introuvable' };
  if (course.instructor.toString() !== userId.toString() && userRole !== 'admin') {
    return { lesson: null, error: 'Accès interdit' };
  }
  return { lesson, course };
};

exports.create = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { title, moduleId, order, duration, isFreePreview, content, videoUrl, pdfUrl } = req.body;
  const lesson = await Lesson.create({
    course: course._id,
    moduleId: moduleId || null,
    title,
    order: order || 0,
    duration: duration || 0,
    isFreePreview: isFreePreview === 'true' || isFreePreview === true,
    content: content || '',
    videoUrl: videoUrl || '',
    pdfUrl: pdfUrl || '',
  });
  res.status(201).json({ success: true, data: lesson });
};

exports.update = async (req, res) => {
  const { lesson, error } = await checkOwner(req.params.id, req.user._id, req.user.role);
  if (error) return res.status(404).json({ success: false, message: error });

  const allowed = ['title', 'order', 'duration', 'isFreePreview', 'content', 'videoUrl', 'pdfUrl', 'moduleId'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) lesson[f] = req.body[f]; });
  // If a PDF file was uploaded, override pdfUrl with the stored file URL
  if (req.file) lesson.pdfUrl = getFileUrl(req.file);
  await lesson.save();
  res.json({ success: true, data: lesson });
};

exports.delete = async (req, res) => {
  const { lesson, error } = await checkOwner(req.params.id, req.user._id, req.user.role);
  if (error) return res.status(404).json({ success: false, message: error });
  await lesson.deleteOne();
  res.json({ success: true, message: 'Leçon supprimée' });
};

exports.reorder = async (req, res) => {
  const { lessons } = req.body;
  await Promise.all(lessons.map(({ id, order }) => Lesson.findByIdAndUpdate(id, { order })));
  res.json({ success: true, message: 'Ordre mis à jour' });
};
