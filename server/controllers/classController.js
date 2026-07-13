const Class = require('../models/Class');
const User = require('../models/User');
const Subject = require('../models/Subject');
const Course = require('../models/Course');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');

exports.list = async (req, res) => {
  const classes = await Class.find(req.schoolFilter)
    .populate('mainTeacher', 'name email')
    .sort({ classe: 1, serie: 1 })
    .lean();

  const data = await Promise.all(classes.map(async (c) => {
    const studentsCount = await User.countDocuments({
      ...req.schoolFilter, role: 'student', classe: c.classe, serie: c.serie,
    });
    return { ...c, studentsCount };
  }));

  res.json({ success: true, data });
};

exports.create = async (req, res) => {
  const { classe, serie } = req.body;
  if (!CLASSES.includes(classe)) {
    return res.status(422).json({ success: false, message: 'Classe invalide' });
  }
  const finalSerie = requiresSerie(classe) ? serie : null;
  if (requiresSerie(classe) && !SERIES.includes(finalSerie)) {
    return res.status(422).json({ success: false, message: 'Série invalide' });
  }

  const existing = await Class.findOne({ school: req.schoolFilter.school, classe, serie: finalSerie });
  if (existing) {
    return res.status(409).json({ success: false, message: 'Cette classe existe déjà' });
  }

  const created = await Class.create({ school: req.schoolFilter.school, classe, serie: finalSerie });
  res.status(201).json({ success: true, data: created });
};

// Only the professeur principal can be changed — classe/serie are the
// document's identity and aren't editable after creation.
exports.update = async (req, res) => {
  const classGroup = await Class.findOne({ _id: req.params.id, ...req.schoolFilter });
  if (!classGroup) return res.status(404).json({ success: false, message: 'Classe introuvable' });

  const { mainTeacher } = req.body;
  if (mainTeacher) {
    const teacher = await User.findOne({ _id: mainTeacher, role: 'instructor', school: req.schoolFilter.school });
    if (!teacher) return res.status(422).json({ success: false, message: 'Formateur invalide' });
    classGroup.mainTeacher = teacher._id;
  } else if (mainTeacher === null) {
    classGroup.mainTeacher = null;
  }

  await classGroup.save();
  const populated = await classGroup.populate('mainTeacher', 'name email');
  res.json({ success: true, data: populated });
};

exports.remove = async (req, res) => {
  const classGroup = await Class.findOneAndDelete({ _id: req.params.id, ...req.schoolFilter });
  if (!classGroup) return res.status(404).json({ success: false, message: 'Classe introuvable' });
  res.json({ success: true, message: 'Classe supprimée' });
};

// ─── Matières affectées à une classe ─────────────────────────────────────────
// "Affecter une matière à une classe et un enseignant" creates the actual
// Course the teacher will develop — there's no separate join table, Course
// already models exactly this relationship (subject/classe/serie/instructor).

exports.listCourses = async (req, res) => {
  const classGroup = await Class.findOne({ _id: req.params.classId, ...req.schoolFilter });
  if (!classGroup) return res.status(404).json({ success: false, message: 'Classe introuvable' });

  const courses = await Course.find({
    school: req.schoolFilter.school, classe: classGroup.classe, serie: classGroup.serie,
  }).populate('instructor', 'name email').sort({ subject: 1 }).lean();

  res.json({ success: true, data: courses });
};

exports.assignCourse = async (req, res) => {
  const classGroup = await Class.findOne({ _id: req.params.classId, ...req.schoolFilter });
  if (!classGroup) return res.status(404).json({ success: false, message: 'Classe introuvable' });

  const { subjectId, teacherId } = req.body;
  const subject = await Subject.findOne({ _id: subjectId, ...req.schoolFilter });
  if (!subject) return res.status(422).json({ success: false, message: 'Matière invalide' });

  const teacher = await User.findOne({ _id: teacherId, role: 'instructor', school: req.schoolFilter.school });
  if (!teacher) return res.status(422).json({ success: false, message: 'Formateur invalide' });

  const existing = await Course.findOne({
    school: req.schoolFilter.school, instructor: teacher._id, subject: subject.name,
    classe: classGroup.classe, serie: classGroup.serie,
  });
  if (existing) return res.status(200).json({ success: true, data: existing });

  const title = `${subject.name} — ${classGroup.classe}${classGroup.serie ? ' ' + classGroup.serie : ''}`;
  const course = await Course.create({
    title, subject: subject.name, instructor: teacher._id, school: req.schoolFilter.school,
    classe: classGroup.classe, serie: classGroup.serie, status: 'draft',
  });
  res.status(201).json({ success: true, data: course });
};

exports.unassignCourse = async (req, res) => {
  const classGroup = await Class.findOne({ _id: req.params.classId, ...req.schoolFilter });
  if (!classGroup) return res.status(404).json({ success: false, message: 'Classe introuvable' });

  const course = await Course.findOneAndDelete({ _id: req.params.courseId, school: req.schoolFilter.school, classe: classGroup.classe, serie: classGroup.serie });
  if (!course) return res.status(404).json({ success: false, message: 'Cours introuvable' });
  res.json({ success: true, message: 'Affectation retirée' });
};
