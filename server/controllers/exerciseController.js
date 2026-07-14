const Exercise = require('../models/Exercise');
const ExerciseAnswer = require('../models/ExerciseAnswer');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const emailService = require('../services/emailService');
const { getFileUrl } = require('../middlewares/upload');
const { canManageCourse } = require('../utils/schoolAuth');
const { generateExerciseStatement } = require('../services/aiContentService');

exports.createForLesson = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ success: false, message: 'Leçon introuvable' });

  const course = await Course.findById(lesson.course);
  if (!canManageCourse(course, req.user)) {
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

// Drafts an exercise statement from the formateur's key points — returned for
// review/editing, not saved until the exercise itself is created.
exports.generateStatement = async (req, res) => {
  const lesson = await Lesson.findById(req.params.lessonId);
  if (!lesson) return res.status(404).json({ success: false, message: 'Leçon introuvable' });

  const course = await Course.findById(lesson.course);
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { points, type } = req.body;
  if (!points?.trim()) return res.status(422).json({ success: false, message: 'Les points clés sont requis' });

  try {
    const statement = await generateExerciseStatement({
      lessonTitle: lesson.title, subject: course.subject, classe: course.classe, serie: course.serie, points, type,
    });
    res.json({ success: true, data: { statement } });
  } catch (e) {
    res.status(502).json({ success: false, message: e.message || 'Échec de la génération' });
  }
};

exports.listForLesson = async (req, res) => {
  const exercises = await Exercise.find({ lesson: req.params.lessonId }).sort({ order: 1 }).lean();
  res.json({ success: true, data: exercises });
};

// Instructor: see every student's answer to one exercise, to grade open ones
exports.listAnswers = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercice introuvable' });
  const course = await Course.findById(exercise.course);
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const answers = await ExerciseAnswer.find({ exercise: exercise._id })
    .populate('student', 'name email avatar')
    .sort({ submittedAt: -1 })
    .lean();
  res.json({ success: true, data: answers });
};

exports.update = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercice introuvable' });
  const course = await Course.findById(exercise.course);
  if (!canManageCourse(course, req.user)) {
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
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  await exercise.deleteOne();
  res.json({ success: true, message: 'Exercice supprimé' });
};

// Notify + email the course instructor that an open-ended exercise needs grading
const notifyInstructorOfSubmission = async (exercise, student) => {
  if (exercise.type !== 'open') return; // QCM is auto-graded, nothing to correct
  const course = await Course.findById(exercise.course);
  const instructor = await User.findById(course.instructor);
  if (!instructor) return;
  const lesson = await Lesson.findById(exercise.lesson).select('title').lean();
  await Notification.create({
    user: instructor._id,
    type: 'grading_needed',
    title: 'Exercice à corriger',
    message: `${student.name} a répondu à un exercice de "${lesson?.title || course.title}".`,
    link: `/instructor/courses/${course._id}/edit`,
  });
  emailService.sendGradingNeeded(instructor, {
    studentName: student.name,
    itemTitle: lesson?.title || exercise.statement,
    courseTitle: course.title,
    link: `${process.env.CLIENT_URL}/instructor/courses/${course._id}/edit`,
  }).catch(() => {});
};

// Student submits answer
exports.submitAnswer = async (req, res) => {
  const exercise = await Exercise.findById(req.params.id);
  if (!exercise) return res.status(404).json({ success: false, message: 'Exercice introuvable' });

  const { answer } = req.body;
  const hasFile = !!req.file;
  if (!answer && !hasFile) {
    return res.status(422).json({ success: false, message: 'Réponse ou fichier requis' });
  }

  let isCorrect = null;
  if (exercise.type === 'qcm') {
    isCorrect = parseInt(answer) === exercise.correctOption;
  }

  const fileFields = hasFile ? { answerFileUrl: getFileUrl(req.file), answerFileName: req.file.originalname } : {};

  const existing = await ExerciseAnswer.findOne({ exercise: exercise._id, student: req.user._id });
  if (existing) {
    if (answer !== undefined) existing.answer = answer;
    if (hasFile) { existing.answerFileUrl = fileFields.answerFileUrl; existing.answerFileName = fileFields.answerFileName; }
    existing.isCorrect = isCorrect;
    existing.submittedAt = new Date();
    await existing.save();
    await notifyInstructorOfSubmission(exercise, req.user).catch(() => {});
    return res.json({ success: true, data: existing, isCorrect });
  }

  const a = await ExerciseAnswer.create({
    exercise: exercise._id,
    student: req.user._id,
    answer: answer || '',
    ...fileFields,
    isCorrect,
    submittedAt: new Date(),
  });
  await notifyInstructorOfSubmission(exercise, req.user).catch(() => {});
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

  const exercise = await Exercise.findById(answer.exercise);
  const student = await User.findById(answer.student);
  if (exercise && student) {
    await Notification.create({
      user: student._id,
      type: 'exercise_graded',
      title: 'Exercice corrigé',
      message: `Votre réponse à "${exercise.statement}" a été corrigée : ${grade}/10.`,
      link: `/courses/${exercise.course}/learn?lesson=${exercise.lesson}`,
    });
    emailService.sendExerciseGraded(student, exercise.statement, grade, feedback).catch(() => {});
  }

  res.json({ success: true, data: answer });
};
