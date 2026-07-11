const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const User = require('../models/User');
const { syncClassEnrollments } = require('./enrollmentController');
const emailService = require('../services/emailService');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEnum(value, allowed) {
  const found = allowed.find((a) => a.toLowerCase() === String(value || '').trim().toLowerCase());
  return found || null;
}

exports.importStudents = async (req, res) => {
  if (!req.file) return res.status(422).json({ success: false, message: 'Fichier CSV requis' });

  let rows;
  try {
    rows = parse(req.file.buffer, { columns: (header) => header.map((h) => h.trim().toLowerCase()), skip_empty_lines: true, trim: true });
  } catch {
    return res.status(422).json({ success: false, message: 'CSV illisible' });
  }

  const errors = [];
  const seenEmails = new Set();
  const candidates = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2; // +1 header, +1 1-based
    const nom = row.nom;
    const email = (row.email || '').toLowerCase().trim();
    const classe = normalizeEnum(row.classe, CLASSES);
    const serie = classe && requiresSerie(classe) ? normalizeEnum(row.serie, SERIES) : null;

    if (!nom || !email) {
      return errors.push({ row: rowNum, email, reason: 'Nom ou email manquant' });
    }
    if (!EMAIL_RE.test(email)) {
      return errors.push({ row: rowNum, email, reason: 'Email invalide' });
    }
    if (!classe) {
      return errors.push({ row: rowNum, email, reason: 'Classe invalide' });
    }
    if (requiresSerie(classe) && !serie) {
      return errors.push({ row: rowNum, email, reason: 'Série invalide' });
    }
    if (seenEmails.has(email)) {
      return errors.push({ row: rowNum, email, reason: 'Doublon dans le fichier' });
    }
    seenEmails.add(email);
    candidates.push({ row: rowNum, nom, email, classe, serie });
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
    const tempPassword = crypto.randomBytes(6).toString('base64url');
    const user = await User.create({
      name: c.nom, email: c.email, password: tempPassword,
      role: 'student', classe: c.classe, serie: c.serie,
    });
    await syncClassEnrollments(user._id, c.classe, c.serie);
    emailService.sendStudentImported(user, tempPassword).catch(() => {});
    created.push({ name: user.name, email: user.email, tempPassword });
  }

  res.json({
    success: true,
    data: { createdCount: created.length, skippedCount: errors.length, created, errors },
  });
};
