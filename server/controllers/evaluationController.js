const Evaluation = require('../models/Evaluation');
const Grade = require('../models/Grade');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const { getFileUrl, optionalUpload } = require('../middlewares/upload');
const bulletinService = require('../services/bulletinService');

// ─── Instructor ─────────────────────────────────────────────────────────────

exports.listForCourse = async (req, res) => {
  const evaluations = await Evaluation.find({ course: req.params.courseId })
    .sort({ trimestre: 1, type: 1, sequence: 1 }).lean();
  res.json({ success: true, data: evaluations });
};

exports.create = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { trimestre, type, sequence, title, date, maxScore } = req.body;
  const evaluation = await Evaluation.create({
    course: course._id,
    trimestre: parseInt(trimestre),
    type,
    sequence: parseInt(sequence) || 1,
    title: title || '',
    date: date || null,
    maxScore: parseInt(maxScore) || 20,
  });
  res.status(201).json({ success: true, data: evaluation });
};

exports.uploadCorrection = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });
  const course = await Course.findById(evaluation.course);
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier PDF envoyé' });
  evaluation.correctionUrl = getFileUrl(req.file);
  await evaluation.save();
  res.json({ success: true, data: evaluation });
};

exports.delete = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });
  const course = await Course.findById(evaluation.course);
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  await Grade.deleteMany({ evaluation: evaluation._id });
  await evaluation.deleteOne();
  res.json({ success: true, message: 'Évaluation supprimée' });
};

// ─── Grades ──────────────────────────────────────────────────────────────────

// Get all grades for an evaluation (instructor view)
exports.getGrades = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });

  // Get enrolled students
  const enrollments = await Enrollment.find({ course: evaluation.course })
    .populate('student', 'name email avatar').lean();

  const grades = await Grade.find({ evaluation: evaluation._id }).lean();
  const gradeMap = Object.fromEntries(grades.map(g => [g.student.toString(), g]));

  const result = enrollments.map(e => ({
    student: e.student,
    grade: gradeMap[e.student._id.toString()] || null,
  }));

  res.json({ success: true, data: result, evaluation });
};

// Save / update grades for an evaluation (bulk)
exports.saveGrades = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });
  const course = await Course.findById(evaluation.course);
  if (course.instructor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const { grades } = req.body; // [{ studentId, score, absent, comment }]
  await Promise.all(grades.map(async (g) => {
    await Grade.findOneAndUpdate(
      { evaluation: evaluation._id, student: g.studentId },
      {
        evaluation: evaluation._id,
        student: g.studentId,
        course: evaluation.course,
        trimestre: evaluation.trimestre,
        score: g.absent ? null : parseFloat(g.score),
        absent: g.absent || false,
        comment: g.comment || '',
        gradedAt: new Date(),
      },
      { upsert: true, new: true }
    );
  }));

  evaluation.isGraded = true;
  await evaluation.save();
  res.json({ success: true, message: 'Notes enregistrées' });
};

// ─── Student: all my evaluations by class ────────────────────────────────────

// Interrogations / devoirs / compositions for every course the student has
// access to (auto-enrolled based on their classe/serie), optionally filtered by trimestre
exports.myEvaluations = async (req, res) => {
  const { trimestre } = req.query;
  const COEFF = { interrogation: 1, devoir: 2, composition: 3 };

  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate('course', 'subject classe serie').lean();
  const courseIds = enrollments.map(e => e.course._id);
  const courseMap = Object.fromEntries(enrollments.map(e => [e.course._id.toString(), e.course]));

  const filter = { course: { $in: courseIds } };
  if (trimestre) filter.trimestre = parseInt(trimestre);

  const evaluations = await Evaluation.find(filter)
    .sort({ trimestre: 1, 'course.subject': 1, type: 1, sequence: 1 }).lean();

  const grades = await Grade.find({ student: req.user._id, evaluation: { $in: evaluations.map(e => e._id) } }).lean();
  const gradeMap = Object.fromEntries(grades.map(g => [g.evaluation.toString(), g]));

  const data = evaluations.map(ev => {
    const g = gradeMap[ev._id.toString()];
    return {
      _id: ev._id,
      course: courseMap[ev.course.toString()],
      trimestre: ev.trimestre,
      type: ev.type,
      sequence: ev.sequence,
      title: ev.title,
      date: ev.date,
      maxScore: ev.maxScore,
      coefficient: COEFF[ev.type] || 1,
      correctionUrl: ev.correctionUrl,
      isGraded: ev.isGraded,
      grade: g ? { score: g.score, absent: g.absent, comment: g.comment } : null,
    };
  });

  res.json({ success: true, data });
};

// ─── Bulletin ────────────────────────────────────────────────────────────────

// Compute a student's bulletin for a trimestre
exports.getBulletin = async (req, res) => {
  const { studentId, trimestre } = req.params;

  // All courses the student is enrolled in
  const enrollments = await Enrollment.find({ student: studentId })
    .populate('course', 'subject classe serie instructor').lean();

  const bulletin = await Promise.all(enrollments.map(async (enr) => {
    const course = enr.course;
    const evals = await Evaluation.find({ course: course._id, trimestre: parseInt(trimestre) })
      .sort({ type: 1, sequence: 1 }).lean();

    const grades = await Grade.find({
      course: course._id,
      student: studentId,
      trimestre: parseInt(trimestre),
    }).lean();
    const gradeMap = Object.fromEntries(grades.map(g => [g.evaluation.toString(), g]));

    // Compute weighted average
    // coefficients: interrogation=1, devoir=2, composition=3
    const COEFF = { interrogation: 1, devoir: 2, composition: 3 };
    let totalWeighted = 0, totalCoeff = 0;

    const evalDetails = evals.map(ev => {
      const g = gradeMap[ev._id.toString()];
      const coeff = COEFF[ev.type] || 1;
      const score20 = g && !g.absent && g.score !== null ? (g.score / ev.maxScore) * 20 : null;
      if (score20 !== null) { totalWeighted += score20 * coeff; totalCoeff += coeff; }
      return {
        _id: ev._id,
        type: ev.type,
        sequence: ev.sequence,
        title: ev.title,
        date: ev.date,
        maxScore: ev.maxScore,
        correctionUrl: ev.correctionUrl,
        coefficient: coeff,
        grade: g ? { score: g.score, absent: g.absent, comment: g.comment } : null,
        score20,
      };
    });

    const moyenne = totalCoeff > 0 ? +(totalWeighted / totalCoeff).toFixed(2) : null;

    return {
      course: { _id: course._id, subject: course.subject, classe: course.classe, serie: course.serie },
      evaluations: evalDetails,
      moyenne,
      appreciation: getAppreciation(moyenne),
    };
  }));

  // Overall average
  const notes = bulletin.filter(b => b.moyenne !== null).map(b => b.moyenne);
  const moyenneGenerale = notes.length ? +(notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : null;

  // Bulletin is available only when every subject has at least one graded evaluation
  // and all required evaluation types (interrogation x2, devoir x1, composition x1) are graded
  const REQUIRED = { interrogation: 2, devoir: 1, composition: 1 };
  const isComplete = bulletin.length > 0 && bulletin.every(subj => {
    const graded = { interrogation: 0, devoir: 0, composition: 0 };
    subj.evaluations.forEach(ev => {
      if (ev.grade && !ev.grade.absent && ev.grade.score !== null) {
        graded[ev.type] = (graded[ev.type] || 0) + 1;
      }
    });
    return graded.interrogation >= REQUIRED.interrogation
      && graded.devoir >= REQUIRED.devoir
      && graded.composition >= REQUIRED.composition;
  });

  res.json({ success: true, data: { trimestre: parseInt(trimestre), bulletin, moyenneGenerale, isComplete } });
};

function getAppreciation(note) {
  if (note === null) return '';
  if (note >= 18) return 'Excellent';
  if (note >= 16) return 'Très bien';
  if (note >= 14) return 'Bien';
  if (note >= 12) return 'Assez bien';
  if (note >= 10) return 'Passable';
  return 'Insuffisant';
}

// My bulletin (student)
exports.myBulletin = async (req, res) => {
  req.params.studentId = req.user._id.toString();
  return exports.getBulletin(req, res);
};

// ─── Bulletin PDF ─────────────────────────────────────────────────────────────

// Helper: collect bulletin data as plain object (bypasses res)
async function collectBulletinData(studentId, trimestre) {
  const enrollments = await Enrollment.find({ student: studentId })
    .populate('course', 'subject classe serie instructor').lean();

  const bulletin = await Promise.all(enrollments.map(async (enr) => {
    const course = enr.course;
    const evals = await Evaluation.find({ course: course._id, trimestre: parseInt(trimestre) })
      .sort({ type: 1, sequence: 1 }).lean();

    const grades = await Grade.find({
      course: course._id,
      student: studentId,
      trimestre: parseInt(trimestre),
    }).lean();
    const gradeMap = Object.fromEntries(grades.map(g => [g.evaluation.toString(), g]));

    const COEFF = { interrogation: 1, devoir: 2, composition: 3 };
    let totalWeighted = 0, totalCoeff = 0;

    const evalDetails = evals.map(ev => {
      const g = gradeMap[ev._id.toString()];
      const coeff = COEFF[ev.type] || 1;
      const score20 = g && !g.absent && g.score !== null ? (g.score / ev.maxScore) * 20 : null;
      if (score20 !== null) { totalWeighted += score20 * coeff; totalCoeff += coeff; }
      return {
        _id: ev._id,
        type: ev.type,
        sequence: ev.sequence,
        title: ev.title,
        date: ev.date,
        maxScore: ev.maxScore,
        coefficient: coeff,
        grade: g ? { score: g.score, absent: g.absent, comment: g.comment } : null,
        score20,
      };
    });

    const moyenne = totalCoeff > 0 ? +(totalWeighted / totalCoeff).toFixed(2) : null;

    return {
      course: { _id: course._id, subject: course.subject, classe: course.classe, serie: course.serie },
      evaluations: evalDetails,
      moyenne,
      appreciation: getAppreciation(moyenne),
    };
  }));

  const notes = bulletin.filter(b => b.moyenne !== null).map(b => b.moyenne);
  const moyenneGenerale = notes.length ? +(notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : null;

  return { trimestre: parseInt(trimestre), bulletin, moyenneGenerale };
}

// PDF bulletin for the connected student
exports.myBulletinPDF = async (req, res) => {
  try {
    const studentId = req.user._id.toString();
    const { trimestre } = req.params;

    const data = await collectBulletinData(studentId, trimestre);
    data.studentName = req.user.name || req.user.email || 'Élève';

    const pdfBuffer = await bulletinService.generateBulletinPDF(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bulletin_T${trimestre}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('myBulletinPDF error:', err.message);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du bulletin PDF' });
  }
};

// PDF bulletin for a given student (instructor / admin)
exports.getBulletinPDF = async (req, res) => {
  try {
    const { studentId, trimestre } = req.params;

    const student = await User.findById(studentId).select('name email').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Élève introuvable' });

    const data = await collectBulletinData(studentId, trimestre);
    data.studentName = student.name || student.email || 'Élève';

    const pdfBuffer = await bulletinService.generateBulletinPDF(data);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="bulletin_${studentId}_T${trimestre}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error('getBulletinPDF error:', err.message);
    res.status(500).json({ success: false, message: 'Erreur lors de la génération du bulletin PDF' });
  }
};
