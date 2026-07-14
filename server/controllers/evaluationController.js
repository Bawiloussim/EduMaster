const Evaluation = require('../models/Evaluation');
const Grade = require('../models/Grade');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const School = require('../models/School');
const Exercise = require('../models/Exercise');
const ExerciseAnswer = require('../models/ExerciseAnswer');
const Notification = require('../models/Notification');
const { getFileUrl, optionalUpload } = require('../middlewares/upload');
const bulletinService = require('../services/bulletinService');
const emailService = require('../services/emailService');
const { getAppreciation } = require('../utils/appreciation');
const { canManageCourse, schoolId } = require('../utils/schoolAuth');

const EVAL_LABEL = (ev) => ev.type === 'interrogation' ? `Interrogation ${ev.sequence}` : ev.type === 'devoir' ? 'Devoir' : 'Composition';

// ─── Instructor ─────────────────────────────────────────────────────────────

exports.listForCourse = async (req, res) => {
  const course = await Course.findById(req.params.courseId).select('school').lean();
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (req.user.role !== 'superadmin' && course.school.toString() !== schoolId(req.user)) {
    return res.status(404).json({ success: false, message: 'Cours introuvable' });
  }
  const evaluations = await Evaluation.find({ course: req.params.courseId })
    .sort({ trimestre: 1, type: 1, sequence: 1 }).lean();
  res.json({ success: true, data: evaluations });
};

// Instructor: for every student enrolled in the course — exercises answered/graded
// count, plus their interrogation/devoir/composition grades for one trimestre.
exports.getStudentsOverview = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  const trimestre = parseInt(req.params.trimestre);

  const [enrollments, exercises, evaluations] = await Promise.all([
    Enrollment.find({ course: course._id }).populate('student', 'name email avatar').sort({ enrolledAt: 1 }).lean(),
    Exercise.find({ course: course._id }).select('_id').lean(),
    Evaluation.find({ course: course._id, trimestre }).sort({ type: 1, sequence: 1 }).lean(),
  ]);

  const exerciseIds = exercises.map((e) => e._id);
  const [answers, grades] = await Promise.all([
    exerciseIds.length ? ExerciseAnswer.find({ exercise: { $in: exerciseIds } }).lean() : [],
    Grade.find({ course: course._id, trimestre }).lean(),
  ]);

  const students = enrollments.map((enr) => {
    const studentId = enr.student._id.toString();
    const studentAnswers = answers.filter((a) => a.student.toString() === studentId);
    const gradeMap = Object.fromEntries(
      grades.filter((g) => g.student.toString() === studentId).map((g) => [g.evaluation.toString(), g])
    );

    return {
      student: enr.student,
      exercises: {
        total: exercises.length,
        answered: studentAnswers.length,
        graded: studentAnswers.filter((a) => a.grade !== null).length,
      },
      evaluations: evaluations.map((ev) => {
        const g = gradeMap[ev._id.toString()];
        return {
          _id: ev._id,
          type: ev.type,
          sequence: ev.sequence,
          maxScore: ev.maxScore,
          score: g?.score ?? null,
          absent: g?.absent ?? false,
        };
      }),
    };
  });

  res.json({ success: true, data: { trimestre, evaluations, students } });
};

exports.create = async (req, res) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  if (!canManageCourse(course, req.user)) {
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
  if (!canManageCourse(course, req.user)) {
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
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  await Grade.deleteMany({ evaluation: evaluation._id });
  await evaluation.deleteOne();
  res.json({ success: true, message: 'Évaluation supprimée' });
};

// Student: upload a photo/scan/PDF of their completed work for an evaluation.
// Upserts onto the student's Grade row without touching any grading fields —
// the instructor may not have entered a score yet, in which case this creates
// the Grade row; if a score already exists, it must survive untouched.
exports.uploadSubmission = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });

  const enrollment = await Enrollment.findOne({ student: req.user._id, course: evaluation.course });
  if (!enrollment) return res.status(403).json({ success: false, message: 'Accès interdit' });

  if (evaluation.signed) {
    return res.status(409).json({ success: false, message: 'Cette évaluation est déjà signée, vous ne pouvez plus envoyer de copie.' });
  }
  if (!req.file) return res.status(422).json({ success: false, message: 'Aucun fichier envoyé' });

  const grade = await Grade.findOneAndUpdate(
    { evaluation: evaluation._id, student: req.user._id },
    {
      $set: {
        submissionUrl: getFileUrl(req.file),
        submissionName: req.file.originalname,
        submittedAt: new Date(),
      },
      $setOnInsert: {
        evaluation: evaluation._id,
        student: req.user._id,
        course: evaluation.course,
        trimestre: evaluation.trimestre,
      },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, data: grade });
};

// ─── Grades ──────────────────────────────────────────────────────────────────

// Get all grades for an evaluation (instructor view)
exports.getGrades = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });
  const course = await Course.findById(evaluation.course).select('school instructor').lean();
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

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
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  if (evaluation.signed) {
    return res.status(409).json({ success: false, message: 'Cette évaluation est signée. Déliez-la avant de modifier les notes.' });
  }

  const { grades } = req.body; // [{ studentId, score, absent, comment }]
  await Promise.all(grades.map(async (g) => {
    // $set only touches grading fields — never clobbers a student's submissionUrl/submissionName/submittedAt
    await Grade.findOneAndUpdate(
      { evaluation: evaluation._id, student: g.studentId },
      {
        $set: {
          score: g.absent ? null : parseFloat(g.score),
          absent: g.absent || false,
          comment: g.comment || '',
          gradedAt: new Date(),
        },
        $setOnInsert: {
          evaluation: evaluation._id,
          student: g.studentId,
          course: evaluation.course,
          trimestre: evaluation.trimestre,
        },
      },
      { upsert: true, new: true }
    );
  }));

  evaluation.isGraded = true;
  await evaluation.save();
  res.json({ success: true, message: 'Notes enregistrées' });
};

// Sign (or unsign) an evaluation — turns entered grades into official bulletin lines
exports.setSignature = async (req, res) => {
  const evaluation = await Evaluation.findById(req.params.id);
  if (!evaluation) return res.status(404).json({ success: false, message: 'Évaluation introuvable' });
  const course = await Course.findById(evaluation.course);
  if (!canManageCourse(course, req.user)) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  const signed = !!req.body.signed;

  if (signed) {
    if (!evaluation.isGraded) {
      return res.status(422).json({ success: false, message: 'Saisissez les notes avant de signer' });
    }
    evaluation.signed = true;
    evaluation.signedBy = req.user._id;
    evaluation.signedAt = new Date();
    await evaluation.save();

    const grades = await Grade.find({ evaluation: evaluation._id }).populate('student', 'name email').lean();
    // Notifications + emails for a whole class shouldn't hold up the response.
    Promise.all(grades.map(async (g) => {
      if (!g.student) return;
      await Notification.create({
        user: g.student._id,
        type: 'grade_signed',
        title: 'Note disponible',
        message: `Votre note pour "${EVAL_LABEL(evaluation)}" (${course.title}) a été validée par ${req.user.name}.`,
        link: '/student',
      });
      await emailService.sendGradeSigned(g.student, {
        evalLabel: EVAL_LABEL(evaluation),
        courseTitle: course.title,
        instructorName: req.user.name,
      }).catch(() => {});
    })).catch(() => {});
  } else {
    evaluation.signed = false;
    evaluation.signedBy = null;
    evaluation.signedAt = null;
    await evaluation.save();
  }

  res.json({ success: true, data: evaluation });
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
      signed: !!ev.signed,
      pendingSignature: !!g && !ev.signed,
      grade: g && ev.signed ? { score: g.score, absent: g.absent, comment: g.comment } : null,
      submissionUrl: g?.submissionUrl || '',
      submissionName: g?.submissionName || '',
      submittedAt: g?.submittedAt || null,
    };
  });

  res.json({ success: true, data });
};

// ─── Bulletin ────────────────────────────────────────────────────────────────

// Compute a student's full bulletin (per-course weighted averages + overall average) for a trimestre.
// Shared by the individual bulletin endpoints, the PDF export, and the Palmarès ranking.
async function computeStudentBulletin(studentId, trimestre) {
  // All courses the student is enrolled in
  const enrollments = await Enrollment.find({ student: studentId })
    .populate({ path: 'course', select: 'subject classe serie instructor', populate: { path: 'instructor', select: 'name' } })
    .lean();

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
      const visible = !!(g && ev.signed && !g.absent && g.score !== null);
      const score20 = visible ? (g.score / ev.maxScore) * 20 : null;
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
        signed: !!ev.signed,
        pendingSignature: !!g && !ev.signed,
        grade: g && ev.signed ? { score: g.score, absent: g.absent, comment: g.comment } : null,
        score20,
      };
    });

    const moyenne = totalCoeff > 0 ? +(totalWeighted / totalCoeff).toFixed(2) : null;

    return {
      course: { _id: course._id, subject: course.subject, classe: course.classe, serie: course.serie },
      instructorName: course.instructor?.name || '',
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

  return { trimestre: parseInt(trimestre), bulletin, moyenneGenerale, isComplete };
}
exports.computeStudentBulletin = computeStudentBulletin;

// Shared by both PDF endpoints below — the bulletin PDF header shows the
// school's own identity (logo, name, address) instead of the platform's.
async function loadSchoolInfo(id) {
  if (!id) return null;
  return School.findById(id).select('name logo city address').lean();
}

exports.getBulletin = async (req, res) => {
  const { studentId, trimestre } = req.params;
  if (studentId !== req.user._id.toString() && req.user.role !== 'superadmin') {
    const student = await User.findById(studentId).select('school').lean();
    if (!student || student.school?.toString() !== schoolId(req.user)) {
      return res.status(404).json({ success: false, message: 'Élève introuvable' });
    }
  }
  const data = await computeStudentBulletin(studentId, trimestre);
  res.json({ success: true, data });
};

// My bulletin (student)
exports.myBulletin = async (req, res) => {
  req.params.studentId = req.user._id.toString();
  return exports.getBulletin(req, res);
};

// ─── Bulletin PDF ─────────────────────────────────────────────────────────────

// PDF bulletin for the connected student
exports.myBulletinPDF = async (req, res) => {
  try {
    const studentId = req.user._id.toString();
    const { trimestre } = req.params;

    const data = await computeStudentBulletin(studentId, trimestre);
    data.studentName = req.user.name || req.user.email || 'Élève';
    data.school = await loadSchoolInfo(schoolId(req.user));

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

    const student = await User.findById(studentId).select('name email school').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Élève introuvable' });
    if (req.user.role !== 'superadmin' && student.school?.toString() !== schoolId(req.user)) {
      return res.status(404).json({ success: false, message: 'Élève introuvable' });
    }

    const data = await computeStudentBulletin(studentId, trimestre);
    data.studentName = student.name || student.email || 'Élève';
    data.school = await loadSchoolInfo(student.school);

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
