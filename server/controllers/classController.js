const Class = require('../models/Class');
const User = require('../models/User');
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
