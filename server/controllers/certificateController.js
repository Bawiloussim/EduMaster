const Certificate = require('../models/Certificate');
const certificateService = require('../services/certificateService');
const Result = require('../models/Result');

exports.mine = async (req, res) => {
  const certs = await Certificate.find({ student: req.user._id })
    .populate('course', 'title coverImage subject classe serie')
    .populate('exam', 'title')
    .sort({ issuedAt: -1 })
    .lean();
  res.json({ success: true, data: certs });
};

// Get attestation for a specific course (student)
exports.forCourse = async (req, res) => {
  const cert = await Certificate.findOne({
    student: req.user._id,
    course: req.params.courseId,
    type: 'completion',
  }).populate('course', 'title subject classe serie').lean();
  if (!cert) return res.status(404).json({ success: false, message: 'Attestation non disponible' });
  res.json({ success: true, data: cert });
};

// Download attestation PDF by certificate id
exports.downloadAttestation = async (req, res) => {
  const cert = await Certificate.findById(req.params.id)
    .populate('student', 'name')
    .populate('course', 'title subject classe serie instructor');

  if (!cert) return res.status(404).json({ success: false, message: 'Attestation introuvable' });
  if (cert.student._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  if (cert.pdfUrl) return res.redirect(cert.pdfUrl);

  const generated = await certificateService.generateCompletion(cert.student._id, cert.course);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="attestation-${cert.uniqueId}.pdf"`);
  res.send(generated._pdfBuffer);
};

exports.verify = async (req, res) => {
  const cert = await Certificate.findOne({ verifyHash: req.params.hash })
    .populate('student', 'name')
    .populate('course', 'title')
    .populate('exam', 'title')
    .lean();
  if (!cert) return res.status(404).json({ success: false, message: 'Certificat introuvable ou invalide' });
  res.json({ success: true, data: cert });
};

exports.download = async (req, res) => {
  const cert = await Certificate.findById(req.params.id)
    .populate('student', 'name')
    .populate('course', 'title')
    .populate('exam', 'title')
    .populate('result');

  if (!cert) return res.status(404).json({ success: false, message: 'Certificat introuvable' });
  if (cert.student._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }

  if (cert.pdfUrl) return res.redirect(cert.pdfUrl);

  const result = await Result.findById(cert.result);
  const generatedCert = await certificateService.generate(
    cert.student, cert.course, cert.exam, result
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="certificat-${cert.uniqueId}.pdf"`);
  res.send(generatedCert._pdfBuffer);
};
