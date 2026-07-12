const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const emailService = require('../services/emailService');
const { syncClassEnrollments } = require('./enrollmentController');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');

const signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' });

const isProd = process.env.NODE_ENV === 'production';
const cookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(422).json({ success: false, message: 'Tous les champs sont requis' });
  }
  const allowedRoles = ['student', 'instructor'];
  const finalRole = allowedRoles.includes(role) ? role : 'student';

  const user = await User.create({ name, email, password, role: finalRole });
  await emailService.sendWelcome(user).catch(() => {});

  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, cookieOpts);
  res.status(201).json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, classe: user.classe, serie: user.serie },
    accessToken,
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ success: false, message: 'Email et mot de passe requis' });
  }
  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
  }

  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, cookieOpts);
  res.json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, classe: user.classe, serie: user.serie },
    accessToken,
  });
};

exports.logout = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (token) {
    await User.findOneAndUpdate({ refreshToken: token }, { refreshToken: '' }).catch(() => {});
  }
  res.clearCookie('refreshToken', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' });
  res.json({ success: true, message: 'Déconnecté' });
};

exports.refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ success: false, message: 'Token manquant' });

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== token) {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  const accessToken = signAccess(user._id);
  res.json({ success: true, accessToken });
};

exports.getMe = async (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      avatar: req.user.avatar,
      bio: req.user.bio,
      classe: req.user.classe,
      serie: req.user.serie,
    },
  });
};

// Student picks their classe/serie (once) — auto-enrolls them in every matching published course
exports.setClasse = async (req, res) => {
  const { classe, serie } = req.body;
  if (!CLASSES.includes(classe) || (requiresSerie(classe) && !SERIES.includes(serie))) {
    return res.status(422).json({ success: false, message: 'Classe ou série invalide' });
  }
  const finalSerie = requiresSerie(classe) ? serie : null;

  const user = await User.findByIdAndUpdate(req.user._id, { classe, serie: finalSerie }, { new: true });
  await syncClassEnrollments(user._id, classe, finalSerie);

  res.json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, classe: user.classe, serie: user.serie },
  });
};

exports.updateProfile = async (req, res) => {
  const { name, bio } = req.body;
  const updates = {};
  if (name) updates.name = name;
  if (bio !== undefined) updates.bio = bio;
  if (req.file) updates.avatar = req.file.path || req.file.secure_url;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
  res.json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio },
  });
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: true, message: 'Si ce compte existe, un email a été envoyé' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  await emailService.sendPasswordReset(user, token).catch(() => {});
  res.json({ success: true, message: 'Email de réinitialisation envoyé' });
};

exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user) return res.status(400).json({ success: false, message: 'Token invalide ou expiré' });

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Mot de passe réinitialisé' });
};
