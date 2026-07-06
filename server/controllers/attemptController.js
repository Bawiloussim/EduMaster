const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Result = require('../models/Result');
const Enrollment = require('../models/Enrollment');
const Certificate = require('../models/Certificate');
const Course = require('../models/Course');
const User = require('../models/User');
const certificateService = require('../services/certificateService');
const emailService = require('../services/emailService');
const Notification = require('../models/Notification');

const shuffle = (arr) => arr.sort(() => Math.random() - 0.5);

exports.start = async (req, res) => {
  const exam = await Exam.findById(req.params.examId).populate('course');
  if (!exam || !exam.isPublished) {
    return res.status(404).json({ success: false, message: 'Examen introuvable ou non publié' });
  }

  const enrollment = await Enrollment.findOne({ student: req.user._id, course: exam.course._id });
  if (!enrollment) return res.status(403).json({ success: false, message: 'Non inscrit à ce cours' });

  const attemptCount = await Result.countDocuments({ student: req.user._id, exam: exam._id });
  if (attemptCount >= exam.maxAttempts) {
    return res.status(400).json({ success: false, message: 'Nombre maximum de tentatives atteint' });
  }

  const inProgress = await Result.findOne({ student: req.user._id, exam: exam._id, status: 'in_progress' });
  if (inProgress) {
    const questions = await Question.find({ _id: { $in: inProgress.questions } }).select('-correctAnswers -explanation').lean();
    return res.json({ success: true, data: inProgress, questions });
  }

  let allQuestions = await Question.find({ exam: exam._id }).lean();
  let selected = allQuestions;
  if (exam.isRandomized) {
    selected = shuffle(allQuestions);
    if (exam.questionCount > 0 && exam.questionCount < allQuestions.length) {
      selected = selected.slice(0, exam.questionCount);
    }
  }

  const result = await Result.create({
    student: req.user._id,
    exam: exam._id,
    questions: selected.map((q) => q._id),
    answers: [],
    startedAt: new Date(),
    attemptNumber: attemptCount + 1,
  });

  // Never send correctAnswers to the client
  const sanitized = selected.map(({ correctAnswers, explanation, ...q }) => q);
  res.status(201).json({ success: true, data: result, questions: sanitized });
};

exports.save = async (req, res) => {
  const result = await Result.findById(req.params.attemptId);
  if (!result || result.student.toString() !== req.user._id.toString()) {
    return res.status(404).json({ success: false, message: 'Tentative introuvable' });
  }
  if (result.submittedAt) {
    return res.status(400).json({ success: false, message: 'Tentative déjà soumise' });
  }
  result.answers = req.body.answers || [];
  await result.save();
  res.json({ success: true, message: 'Réponses sauvegardées' });
};

exports.focusLost = async (req, res) => {
  const result = await Result.findById(req.params.attemptId);
  if (!result || result.student.toString() !== req.user._id.toString()) {
    return res.status(404).json({ success: false, message: 'Tentative introuvable' });
  }
  if (!result.submittedAt) {
    result.focusLostCount += 1;
    await result.save();
  }
  res.json({ success: true, focusLostCount: result.focusLostCount });
};

exports.submit = async (req, res) => {
  const result = await Result.findById(req.params.attemptId);
  if (!result || result.student.toString() !== req.user._id.toString()) {
    return res.status(404).json({ success: false, message: 'Tentative introuvable' });
  }
  if (result.submittedAt) {
    return res.status(400).json({ success: false, message: 'Déjà soumis' });
  }

  const exam = await Exam.findById(result.exam).populate('course');
  const now = new Date();
  const elapsed = (now - result.startedAt) / 1000 / 60;
  if (elapsed > exam.duration + 1) {
    return res.status(400).json({ success: false, message: 'Temps écoulé' });
  }

  const questions = await Question.find({ _id: { $in: result.questions } }).lean();
  const answersMap = {};
  (req.body.answers || result.answers || []).forEach((a) => {
    answersMap[a.questionId] = a.answer;
  });

  let totalPoints = 0;
  let earnedPoints = 0;
  let needsManualGrading = false;
  const gradedAnswers = [];

  for (const q of questions) {
    totalPoints += q.points;
    const userAnswer = answersMap[q._id.toString()];
    let isCorrect = null;
    let pointsEarned = 0;

    if (q.type === 'open') {
      needsManualGrading = true;
      isCorrect = null;
    } else if (q.type === 'qcm' || q.type === 'truefalse') {
      const correctSet = new Set(q.correctAnswers.map(String));
      const userSet = new Set(Array.isArray(userAnswer) ? userAnswer.map(String) : [String(userAnswer ?? '')]);
      isCorrect = correctSet.size === userSet.size && [...correctSet].every((v) => userSet.has(v));
      if (isCorrect) { pointsEarned = q.points; earnedPoints += q.points; }
    } else if (q.type === 'multiple') {
      const correctSet = new Set(q.correctAnswers.map(String));
      const userSet = new Set(Array.isArray(userAnswer) ? userAnswer.map(String) : []);
      isCorrect = correctSet.size === userSet.size && [...correctSet].every((v) => userSet.has(v));
      if (isCorrect) { pointsEarned = q.points; earnedPoints += q.points; }
    }

    gradedAnswers.push({
      questionId: q._id,
      answer: userAnswer ?? null,
      isCorrect,
      pointsEarned,
    });
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = !needsManualGrading && score >= exam.passingScore;

  result.answers = gradedAnswers;
  result.score = score;
  result.passed = passed;
  result.submittedAt = now;
  result.status = needsManualGrading ? 'submitted' : 'graded';
  result.needsManualGrading = needsManualGrading;
  await result.save();

  let certificate = null;
  if (passed) {
    certificate = await certificateService.generate(req.user, exam.course, exam, result);
    await Notification.create({
      user: req.user._id,
      type: 'certificate_ready',
      title: 'Certificat disponible',
      message: `Félicitations ! Votre certificat pour "${exam.course.title}" est prêt.`,
      link: `/certificates`,
    });
    await emailService.sendCertificateReady(req.user, exam.course, `${process.env.CLIENT_URL}/certificates/verify/${certificate.verifyHash}`).catch(() => {});
  }

  if (needsManualGrading) {
    const instructor = await User.findById(exam.course.instructor);
    if (instructor) {
      await Notification.create({
        user: instructor._id,
        type: 'grading_needed',
        title: 'Copie à corriger',
        message: `${req.user.name} a soumis "${exam.title}" — des questions ouvertes attendent une correction.`,
        link: `/instructor/grading`,
      });
      await emailService.sendGradingNeeded(instructor, {
        studentName: req.user.name,
        itemTitle: exam.title,
        courseTitle: exam.course.title,
        link: `${process.env.CLIENT_URL}/instructor/grading`,
      }).catch(() => {});
    }
  } else {
    await Notification.create({
      user: req.user._id,
      type: 'exam_result',
      title: 'Résultat d\'examen',
      message: `Vous avez obtenu ${score}% à "${exam.title}". ${passed ? 'Félicitations !' : 'Bonne chance pour la prochaine tentative.'}`,
      link: `/exams/${exam._id}/result/${result._id}`,
    });
  }

  const questionsWithExplanations = await Question.find({ _id: { $in: result.questions } }).lean();
  res.json({
    success: true,
    data: { result, questions: questionsWithExplanations, certificate },
  });
};

exports.getResult = async (req, res) => {
  const result = await Result.findById(req.params.resultId)
    .populate('exam')
    .populate('questions')
    .lean();
  if (!result) return res.status(404).json({ success: false, message: 'Résultat introuvable' });
  if (result.student.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    const exam = await Exam.findById(result.exam).populate('course');
    if (!exam || exam.course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Accès interdit' });
    }
  }
  res.json({ success: true, data: result });
};

exports.gradeOpenQuestion = async (req, res) => {
  const result = await Result.findById(req.params.resultId).populate({ path: 'exam', populate: 'course' });
  if (!result) return res.status(404).json({ success: false, message: 'Résultat introuvable' });
  if (result.exam.course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { questionId, score: qScore, comment } = req.body;
  const answer = result.answers.find((a) => a.questionId.toString() === questionId);
  if (!answer) return res.status(404).json({ success: false, message: 'Réponse introuvable' });

  answer.instructorScore = qScore;
  answer.instructorComment = comment;
  answer.isCorrect = qScore > 0;
  answer.pointsEarned = qScore;

  const allGraded = result.answers.every((a) => a.isCorrect !== null || a.instructorScore !== null);
  if (allGraded) {
    const exam = await Exam.findById(result.exam._id);
    const questions = await Question.find({ _id: { $in: result.questions } }).lean();
    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    const earned = result.answers.reduce((s, a) => s + (a.pointsEarned || 0), 0);
    result.score = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
    result.passed = result.score >= exam.passingScore;
    result.status = 'graded';
    result.needsManualGrading = false;

    const student = await User.findById(result.student);

    if (result.passed && student) {
      const certificate = await certificateService.generate(student, result.exam.course, exam, result).catch(() => null);
      if (certificate) {
        await Notification.create({
          user: student._id,
          type: 'certificate_ready',
          title: 'Certificat disponible',
          message: `Félicitations ! Votre certificat pour "${result.exam.course.title}" est prêt.`,
          link: `/certificates`,
        });
        await emailService.sendCertificateReady(student, result.exam.course, `${process.env.CLIENT_URL}/certificates/verify/${certificate.verifyHash}`).catch(() => {});
      }
    }

    if (student) {
      await Notification.create({
        user: student._id,
        type: 'exam_result',
        title: 'Résultat d\'examen',
        message: `Votre copie pour "${exam.title}" a été corrigée. Vous avez obtenu ${result.score}%. ${result.passed ? 'Félicitations !' : ''}`,
        link: `/exams/${exam._id}/result/${result._id}`,
      });
      await emailService.sendExamResult(student, exam, result.score, result.passed).catch(() => {});
    }
  }

  await result.save();
  res.json({ success: true, data: result });
};

exports.myResults = async (req, res) => {
  const results = await Result.find({ student: req.user._id })
    .populate('exam', 'title passingScore')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: results });
};

exports.instructorResults = async (req, res) => {
  const exam = await Exam.findById(req.params.examId).populate('course');
  if (!exam) return res.status(404).json({ success: false, message: 'Examen introuvable' });
  if (exam.course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const results = await Result.find({ exam: exam._id })
    .populate('student', 'name email avatar')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: results });
};

// All exam attempts across the instructor's courses that still need manual grading
exports.myPendingGrading = async (req, res) => {
  const courses = await Course.find({ instructor: req.user._id }).select('_id').lean();
  const exams = await Exam.find({ course: { $in: courses.map((c) => c._id) } }).populate('course', 'title').lean();
  const examIds = exams.map((e) => e._id);
  const examById = Object.fromEntries(exams.map((e) => [e._id.toString(), e]));

  const results = await Result.find({ exam: { $in: examIds }, needsManualGrading: true, status: 'submitted' })
    .populate('student', 'name email avatar')
    .populate('questions')
    .sort({ submittedAt: 1 })
    .lean();

  const data = results.map((r) => ({ ...r, exam: examById[r.exam.toString()] }));
  res.json({ success: true, data });
};
