const Exercise = require('../models/Exercise');
const ExerciseAnswer = require('../models/ExerciseAnswer');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');

exports.createForLesson = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ success: false, message: 'Leçon introuvable' });

  const course = await Course.findById(lesson.course);
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { statement, type, options, correctOption, order } = req.body;
  const exercise = await Exercise.create({
    lesson: lesson._id,
    course: lesson.course,
    statement,
    type: type || 'open',
    options: type === 'qcm' ? options : [],
    correctOption: type === 'qcm' ? correctOption : null,
    order: order !== undefined ? order : (await Exercise.countDocuments({ lesson: lesson._id })),
  });
  res.status(201).json({ success: true, data: exercise });
};

exports.listForLesson = async (req, res) => {
  const exercises = await Exercise.find({ lesson: req.params.lessonId }).sort({ order: 1 }).lean();
  res.json({ success: true, data: exercises });
};

exports.update = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercice introuvable' });
  const course = await Course.findById(exercise.course);
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const allowed = ['statement', 'type', 'options', 'correctOption', 'order'];
  allowed.forEach(f => { if (req.body[f] !== undefined) exercise[f] = req.body[f]; });
  await exercise.save();
  res.json({ success: true, data: exercise });
};

exports.delete = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercice introuvable' });
  const course = await Course.findById(exercise.course);
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  await exercise.deleteOne();
  res.json({ success: true, message: 'Exercice supprimé' });
};

// Student submits answer
exports.submitAnswer = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercice introuvable' });

  const { answer } = req.body;
  let isCorrect = null;
  if (exercise.type === 'qcm') {
    isCorrect = parseInt(answer) === exercise.correctOption;
  }

  const existing = await ExerciseAnswer.findOne({ exercise: exercise._id, student: req.user._id });
  if (existing) {
    existing.answer = answer;
    existing.isCorrect = isCorrect;
    existing.submittedAt = new Date();
    await existing.save();
    return res.json({ success: true, data: existing, isCorrect });
  }

  const a = await ExerciseAnswer.create({
    exercise: exercise._id,
    student: req.user._id,
    answer,
    isCorrect,
    submittedAt: new Date(),
  });
  res.status(201).json({ success: true, data: a, isCorrect });
};

// Student's answers for a lesson's exercises
exports.myAnswersForLesson = async (req, res) => {
  const exercises = await Exercise.find({ lesson: req.params.lessonId }).select('_id').lean();
  const ids = exercises.map(e => e._id);
  const answers = await ExerciseAnswer.find({ exercise: { $in: ids }, student: req.user._id }).lean();
  res.json({ success: true, data: answers });
};

// Instructor grades an open answer
exports.gradeAnswer = async (req, res) => {
  const answer = await ExerciseAnswer.findById(req.params.answerId);
  if (!answer) return res.status(404).json({ success: false, message: 'Réponse introuvable' });
  const { grade, feedback } = req.body;
  answer.grade = grade;
  answer.feedback = feedback || '';
  answer.gradedBy = req.user._id;
  answer.gradedAt = new Date();
  await answer.save();
  res.json({ success: true, data: answer });
};
