const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const checkInstructor = async (examId, userId, userRole) => {
  const exam = await Exam.findById(examId).populate('course');
  if (!exam) return { exam: null, error: 'Examen introuvable' };
  if (exam.course.instructor.toString() !== userId.toString() && userRole !== 'admin') {
    return { exam: null, error: 'Accès interdit' };
  }
  return { exam };
};

exports.create = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { title, description, duration, passingScore, maxAttempts, questionCount, isRandomized } = req.body;
  const exam = await Exam.create({
    course: course._id, title, description,
    duration: parseInt(duration),
    passingScore: parseFloat(passingScore),
    maxAttempts: parseInt(maxAttempts || 3),
    questionCount: parseInt(questionCount || 0),
    isRandomized: isRandomized !== false,
  });
  res.status(201).json({ success: true, data: exam });
};

exports.update = async (req, res) => {
  const { exam, error } = await checkInstructor(req.params.id, req.user._id, req.user.role);
  if (error) return res.status(404).json({ success: false, message: error });

  const allowed = ['title', 'description', 'duration', 'passingScore', 'maxAttempts', 'questionCount', 'isRandomized', 'isPublished'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) exam[f] = req.body[f]; });
  await exam.save();
  res.json({ success: true, data: exam });
};

exports.delete = async (req, res) => {
  const { exam, error } = await checkInstructor(req.params.id, req.user._id, req.user.role);
  if (error) return res.status(404).json({ success: false, message: error });
  await Question.deleteMany({ exam: exam._id });
  await exam.deleteOne();
  res.json({ success: true, message: 'Examen supprimé' });
};

exports.getOne = async (req, res) => {
  const exam = await Exam.findById(req.params.id).populate('course', 'title instructor');
  if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable' });

  const isInstructor = req.user.role === 'admin' ||
    exam.course.instructor.toString() === req.user._id.toString();

  if (!isInstructor) {
    const enrollment = await Enrollment.findOne({ student: req.user._id, course: exam.course._id });
    if (!enrollment) return res.status(403).json({ success: false, message: 'Non inscrit à ce cours' });
  }

  const questions = isInstructor
    ? await Question.find({ exam: exam._id }).lean()
    : [];

  res.json({ success: true, data: { ...exam.toObject(), questions } });
};

exports.getForCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });

  const isInstructor = req.user.role === 'admin' ||
    course.instructor.toString() === req.user._id.toString();

  const filter = { course: course._id };
  if (!isInstructor) filter.isPublished = true;

  const exams = await Exam.find(filter).lean();
  res.json({ success: true, data: exams });
};

exports.addQuestion = async (req, res) => {
  const { exam, error } = await checkInstructor(req.params.id, req.user._id, req.user.role);
  if (error) return res.status(404).json({ success: false, message: error });

  const { type, text, options, correctAnswers, explanation, points } = req.body;
  const question = await Question.create({
    exam: exam._id, type, text,
    options: options || [],
    correctAnswers: correctAnswers || [],
    explanation: explanation || '',
    points: points || 1,
  });
  res.status(201).json({ success: true, data: question });
};

exports.updateQuestion = async (req, res) => {
  const question = await Question.findById(req.params.questionId).populate({ path: 'exam', populate: 'course' });
  if (!question) return res.status(404).json({ success: false, message: 'Question introuvable' });
  if (question.exam.course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const allowed = ['type', 'text', 'options', 'correctAnswers', 'explanation', 'points'];
  allowed.forEach((f) => { if (req.body[f] !== undefined) question[f] = req.body[f]; });
  await question.save();
  res.json({ success: true, data: question });
};

exports.deleteQuestion = async (req, res) => {
  const question = await Question.findById(req.params.questionId).populate({ path: 'exam', populate: 'course' });
  if (!question) return res.status(404).json({ success: false, message: 'Question introuvable' });
  if (question.exam.course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  await question.deleteOne();
  res.json({ success: true, message: 'Question supprimée' });
};
