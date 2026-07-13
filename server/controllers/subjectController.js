const Subject = require('../models/Subject');
const Course = require('../models/Course');

exports.list = async (req, res) => {
  const subjects = await Subject.find(req.schoolFilter).sort({ name: 1 }).lean();
  res.json({ success: true, data: subjects });
};

exports.create = async (req, res) => {
  const { name, code } = req.body;
  if (!name || !name.trim()) return res.status(422).json({ success: false, message: 'Le nom de la matière est requis' });

  const existing = await Subject.findOne({ school: req.schoolFilter.school, name: name.trim() })
    .collation({ locale: 'fr', strength: 2 });
  if (existing) return res.status(409).json({ success: false, message: 'Cette matière existe déjà' });

  const subject = await Subject.create({ school: req.schoolFilter.school, name: name.trim(), code: code || '' });
  res.status(201).json({ success: true, data: subject });
};

exports.update = async (req, res) => {
  const { name, code } = req.body;
  const subject = await Subject.findOne({ _id: req.params.id, ...req.schoolFilter });
  if (!subject) return res.status(404).json({ success: false, message: 'Matière introuvable' });

  if (name !== undefined) subject.name = name.trim();
  if (code !== undefined) subject.code = code;
  await subject.save();
  res.json({ success: true, data: subject });
};

exports.remove = async (req, res) => {
  const subject = await Subject.findOne({ _id: req.params.id, ...req.schoolFilter });
  if (!subject) return res.status(404).json({ success: false, message: 'Matière introuvable' });

  const coursesCount = await Course.countDocuments({ school: req.schoolFilter.school, subject: subject.name });
  if (coursesCount > 0) {
    return res.status(409).json({ success: false, message: 'Cette matière est utilisée par des cours existants' });
  }

  await subject.deleteOne();
  res.json({ success: true, message: 'Matière supprimée' });
};
