const crypto = require('crypto');
const User = require('../models/User');
const Course = require('../models/Course');
const Class = require('../models/Class');
const { syncClassEnrollments } = require('./enrollmentController');
const emailService = require('../services/emailService');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');
const { schoolId } = require('../utils/schoolAuth');
const { parseImportFile } = require('../utils/importParser');
const { generateMatricule } = require('../utils/matricule');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEnum(value, allowed) {
  const found = allowed.find((a) => a.toLowerCase() === String(value || '').trim().toLowerCase());
  return found || null;
}

function fullName(nom, prenom) {
  return [prenom, nom].filter(Boolean).join(' ').trim();
}

function parseBirthDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

exports.importStudents = async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, message: 'Fichier CSV ou Excel requis' });

  let rows;
  try {
    rows = await parseImportFile(req.file.buffer, req.file.originalname);
  } catch {
    return res.status(422).json({ success: false, message: 'Fichier illisible' });
  }

  const errors = [];
  const seenEmails = new Set();
  const candidates = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +1 header, +1 1-based
    const name = fullName(row.nom, row.prenom || '');
    const email = (row.email || '').toLowerCase().trim();
    const classe = normalizeEnum(row.classe, CLASSES);
    const serie = classe && requiresSerie(classe) ? normalizeEnum(row.serie, SERIES) : null;

    if (!name || !email) {
      errors.push({ row: rowNum, email, reason: 'Nom ou email manquant' });
      continue;
    }
    if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowNum, email, reason: 'Email invalide' });
      continue;
    }
    if (!classe) {
      errors.push({ row: rowNum, email, reason: 'Classe invalide' });
      continue;
    }
    if (requiresSerie(classe) && !serie) {
      errors.push({ row: rowNum, email, reason: 'Série invalide' });
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const classExists = await Class.findOne({ school: schoolId(req.user), classe, serie });
    if (!classExists) {
      errors.push({ row: rowNum, email, reason: "Cette classe n'existe pas encore pour votre établissement" });
      continue;
    }
    if (seenEmails.has(email)) {
      errors.push({ row: rowNum, email, reason: 'Doublon dans le fichier' });
      continue;
    }
    seenEmails.add(email);

    const genre = normalizeEnum(row.genre, ['M', 'F']);
    candidates.push({
      row: rowNum, name, email, classe, serie,
      password: row.mot_de_passe || null,
      matricule: row.matricule || '',
      phone: row.telephone || '',
      gender: genre,
      birthDate: parseBirthDate(row.date_naissance),
    });
  }

  if (candidates.length) {
    const existing = await User.find({ email: { $in: candidates.map((c) => c.email) } }).select('email').lean();
    const existingEmails = new Set(existing.map((u) => u.email));
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (existingEmails.has(candidates[i].email)) {
        errors.push({ row: candidates[i].row, email: candidates[i].email, reason: 'Compte déjà existant' });
        candidates.splice(i, 1);
      }
    }
  }

  const created = [];
  for (const c of candidates) {
    const tempPassword = c.password || crypto.randomBytes(6).toString('base64url');
    const user = await User.create({
      name: c.name, email: c.email, password: tempPassword,
      role: 'student', school: schoolId(req.user), classe: c.classe, serie: c.serie,
      matricule: c.matricule || await generateMatricule(schoolId(req.user)), phone: c.phone, gender: c.gender, birthDate: c.birthDate,
      // CSV/Excel imports are vouched for by the school's own admin — skip self-verification.
      emailVerified: true,
    });
    await syncClassEnrollments(user._id, schoolId(req.user), c.classe, c.serie);
    emailService.sendStudentImported(user, tempPassword).catch(() => {});
    created.push({ name: user.name, email: user.email, tempPassword });
  }

  res.json({
    success: true,
    data: { createdCount: created.length, skippedCount: errors.length, created, errors },
  });
};

exports.importInstructors = async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, message: 'Fichier CSV ou Excel requis' });

  let rows;
  try {
    rows = await parseImportFile(req.file.buffer, req.file.originalname);
  } catch {
    return res.status(422).json({ success: false, message: 'Fichier illisible' });
  }

  const errors = [];
  const seenEmails = new Set();
  const candidates = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const name = fullName(row.nom, row.prenom || '');
    const email = (row.email || '').toLowerCase().trim();

    if (!name || !email) {
      return errors.push({ row: rowNum, email, reason: 'Nom ou email manquant' });
    }
    if (!EMAIL_RE.test(email)) {
      return errors.push({ row: rowNum, email, reason: 'Email invalide' });
    }
    if (seenEmails.has(email)) {
      return errors.push({ row: rowNum, email, reason: 'Doublon dans le fichier' });
    }
    seenEmails.add(email);
    candidates.push({
      row: rowNum, name, email,
      password: row.mot_de_passe || null,
      phone: row.telephone || '',
      gender: normalizeEnum(row.genre, ['M', 'F']),
    });
  });

  if (candidates.length) {
    const existing = await User.find({ email: { $in: candidates.map((c) => c.email) } }).select('email').lean();
    const existingEmails = new Set(existing.map((u) => u.email));
    for (let i = candidates.length - 1; i >= 0; i--) {
      if (existingEmails.has(candidates[i].email)) {
        errors.push({ row: candidates[i].row, email: candidates[i].email, reason: 'Compte déjà existant' });
        candidates.splice(i, 1);
      }
    }
  }

  const created = [];
  for (const c of candidates) {
    const tempPassword = c.password || crypto.randomBytes(6).toString('base64url');
    const user = await User.create({
      name: c.name, email: c.email, password: tempPassword, role: 'instructor',
      school: schoolId(req.user), phone: c.phone, gender: c.gender, emailVerified: true,
    });
    emailService.sendStudentImported(user, tempPassword).catch(() => {});
    created.push({ name: user.name, email: user.email, tempPassword });
  }

  res.json({
    success: true,
    data: { createdCount: created.length, skippedCount: errors.length, created, errors },
  });
};

exports.importCourses = async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, message: 'Fichier CSV ou Excel requis' });

  let rows;
  try {
    rows = await parseImportFile(req.file.buffer, req.file.originalname);
  } catch {
    return res.status(422).json({ success: false, message: 'Fichier illisible' });
  }

  const errors = [];
  const candidates = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const matiere = row.matiere;
    const description = row.description || '';
    const emailFormateur = (row.email_formateur || '').toLowerCase().trim();
    const classe = normalizeEnum(row.classe, CLASSES);
    const serie = classe && requiresSerie(classe) ? normalizeEnum(row.serie, SERIES) : null;

    if (!matiere) {
      return errors.push({ row: rowNum, email: emailFormateur, reason: 'Matière manquante' });
    }
    if (!classe) {
      return errors.push({ row: rowNum, email: emailFormateur, reason: 'Classe invalide' });
    }
    if (requiresSerie(classe) && !serie) {
      return errors.push({ row: rowNum, email: emailFormateur, reason: 'Série invalide' });
    }
    if (!emailFormateur || !EMAIL_RE.test(emailFormateur)) {
      return errors.push({ row: rowNum, email: emailFormateur, reason: 'Email du formateur manquant ou invalide' });
    }
    candidates.push({ row: rowNum, matiere, description, classe, serie, emailFormateur });
  });

  if (candidates.length) {
    const instructors = await User.find({
      email: { $in: candidates.map((c) => c.emailFormateur) },
      role: { $in: ['instructor', 'admin'] },
      school: schoolId(req.user),
    }).select('email name').lean();
    const instructorByEmail = new Map(instructors.map((u) => [u.email, u]));

    for (let i = candidates.length - 1; i >= 0; i--) {
      if (!instructorByEmail.has(candidates[i].emailFormateur)) {
        errors.push({ row: candidates[i].row, email: candidates[i].emailFormateur, reason: 'Formateur introuvable' });
        candidates.splice(i, 1);
      }
    }

    const created = [];
    for (const c of candidates) {
      const instructor = instructorByEmail.get(c.emailFormateur);
      const course = await Course.create({
        title: c.matiere, subject: c.matiere, description: c.description,
        classe: c.classe, serie: c.serie, instructor: instructor._id, school: schoolId(req.user),
      });
      created.push({ title: course.title, classe: course.classe, serie: course.serie, formateur: instructor.name });
    }

    return res.json({
      success: true,
      data: { createdCount: created.length, skippedCount: errors.length, created, errors },
    });
  }

  res.json({ success: true, data: { createdCount: 0, skippedCount: errors.length, created: [], errors } });
};
