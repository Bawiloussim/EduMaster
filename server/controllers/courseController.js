const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');

exports.list = async (req, res) => {
  const { search, category, level, page = 1, limit = 12 } = req.query;
  const filter = { status: 'published' };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (search) filter.$text = { $search: search };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('instructor', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Course.countDocuments(filter),
  ]);

  res.json({ success: true, data: courses, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

exports.getOne = async (req, res) => {
  const course = await Course.findById(req.params.id).populate('instructor', 'name avatar bio');
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });

  const lessons = await Lesson.find({ course: course._id }).sort({ moduleId: 1, order: 1 }).lean();

  let isEnrolled = false;
  let enrollment = null;
  if (req.user) {
    enrollment = await Enrollment.findOne({ student: req.user._id, course: course._id }).lean();
    isEnrolled = !!enrollment;
  }

  const lessonData = lessons.map((l) => ({
    ...l,
    contentUrl: isEnrolled || l.isFreePreview ? l.contentUrl : undefined,
    content: isEnrolled || l.isFreePreview ? l.content : undefined,
  }));

  res.json({ success: true, data: { ...course.toObject(), lessons: lessonData, isEnrolled, enrollment } });
};

exports.create = async (req, res) => {
  const { title, description, category, level, price, tags, language, estimatedDuration } = req.body;
  const course = await Course.create({
    title, description, category, level,
    price: price || 0, tags: tags ? JSON.parse(tags) : [],
    language, estimatedDuration,
    instructor: req.user._id,
    coverImage: req.file ? (req.file.path || req.file.secure_url) : '',
  });
  res.status(201).json({ success: true, data: course });
};

exports.update = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const allowed = ['title', 'description', 'category', 'level', 'tags', 'language', 'estimatedDuration'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) course[f] = req.body[f]; });
  if (req.body.tags) course.tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
  if (req.file) course.coverImage = req.file.path || req.file.secure_url;
  await course.save();
  res.json({ success: true, data: course });
};

exports.delete = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  await Lesson.deleteMany({ course: course._id });
  await course.deleteOne();
  res.json({ success: true, message: 'Cours supprimé' });
};

exports.publish = async (req, res) => {
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  course.status = course.status === 'published' ? 'draft' : 'published';
  await course.save();
  res.json({ success: true, data: course });
};

exports.addModule = async (req, res) => {
  const { title, order } = req.body;
  const course = await Course.findById(req.params.id);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  course.modules.push({ title, order: order || course.modules.length });
  await course.save();
  res.json({ success: true, data: course });
};

exports.instructorCourses = async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: courses });
};

exports.adminList = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [courses, total] = await Promise.all([
    Course.find().populate('instructor', 'name email').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    Course.countDocuments(),
  ]);
  res.json({ success: true, data: courses, total });
};
