const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const School = require('../models/School');
const emailService = require('../services/emailService');
const { syncClassEnrollments } = require('./enrollmentController');
const { schoolId: resolveSchoolId } = require('../utils/schoolAuth');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');
const { STATUS_MESSAGES } = require('../middlewares/auth');

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

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

// Shared by password registration and Google sign-up — everything past
// "we know who this is and they don't have an account yet".
async function createAccountAndRespond(res, { name, email, password, googleId, emailVerified, role, schoolId, classe, serie }) {
  const allowedRoles = ['student', 'instructor', 'admin'];
  const finalRole = allowedRoles.includes(role) ? role : 'student';
  const isPrincipal = finalRole === 'admin';

  // A principal creates their own school through the onboarding wizard after
  // this — they never join an existing one, so there's no schoolId to resolve.
  let school = null;
  if (!isPrincipal) {
    school = await School.findOne({ _id: schoolId, status: 'active' });
    if (!school) {
      res.status(422).json({ success: false, message: 'Établissement invalide' });
      return;
    }
  }

  const userData = {
    name, email, role: finalRole, school: school?._id || null,
    status: 'active',
    emailVerified: !!emailVerified,
  };
  if (password) userData.password = password;
  if (googleId) userData.googleId = googleId;

  if (finalRole === 'student' && classe && CLASSES.includes(classe) && (!requiresSerie(classe) || SERIES.includes(serie))) {
    userData.classe = classe;
    userData.serie = requiresSerie(classe) ? serie : null;
  }

  const user = await User.create(userData);

  // Fire-and-forget — an SMTP round trip shouldn't hold up the HTTP response.
  emailService.sendWelcome(user).catch(() => {});
  if (!emailVerified) {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    emailService.sendVerificationEmail(user, verificationToken).catch(() => {});
  }

  if (userData.classe) await syncClassEnrollments(user._id, school._id, userData.classe, userData.serie);

  // A principal must verify their email before logging in (checked in `login`,
  // never here) — issuing a token immediately would let them skip that gate,
  // since register never goes through the login controller's own check.
  if (isPrincipal && !emailVerified) {
    res.status(201).json({
      success: true,
      message: 'Compte créé — vérifiez votre email puis connectez-vous pour créer votre établissement.',
    });
    return;
  }

  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, cookieOpts);
  res.status(201).json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, school: school ? { _id: school._id, name: school.name, status: school.status, logo: school.logo } : null, avatar: user.avatar, classe: user.classe, serie: user.serie },
    accessToken,
  });
}

exports.register = async (req, res) => {
  const { name, email, password, role, schoolId, classe, serie } = req.body;
  if (!name || !email || !password) {
    return res.status(422).json({ success: false, message: 'Tous les champs sont requis' });
  }
  if (role === 'admin' && schoolId) {
    return res.status(422).json({ success: false, message: "Un chef d'établissement crée son propre établissement, il ne rejoint pas un établissement existant" });
  }
  await createAccountAndRespond(res, { name, email, password, emailVerified: false, role, schoolId, classe, serie });
};

// Register or log in with a Google ID token. The Google button lives on the
// registration form (role/school/classe are chosen there first), but if the
// verified Google email already matches an existing account, we log that
// account in instead of erroring — same as every other "Sign in with Google".
exports.google = async (req, res) => {
  if (!googleClient) {
    return res.status(500).json({ success: false, message: "Connexion Google non configurée sur le serveur" });
  }
  const { credential, role, schoolId, classe, serie } = req.body;
  if (!credential) return res.status(422).json({ success: false, message: 'Jeton Google manquant' });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ success: false, message: 'Jeton Google invalide' });
  }
  if (!payload.email_verified) {
    return res.status(422).json({ success: false, message: "L'adresse email Google n'est pas vérifiée" });
  }

  const email = payload.email.toLowerCase();
  const existing = await User.findOne({ email }).select('+refreshToken').populate('school', 'name status logo phone email address');

  if (existing) {
    if (!existing.googleId) {
      existing.googleId = payload.sub;
    }
    if (!existing.emailVerified) {
      existing.emailVerified = true; // Google already vouches for this email
    }
    if (existing.status !== 'active') {
      return res.status(403).json({ success: false, message: STATUS_MESSAGES[existing.status] || 'Compte inactif' });
    }
    if (existing.school && existing.school.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Votre établissement a été suspendu' });
    }

    const accessToken = signAccess(existing._id);
    const refreshToken = signRefresh(existing._id);
    existing.refreshToken = refreshToken;
    await existing.save({ validateBeforeSave: false });

    res.cookie('refreshToken', refreshToken, cookieOpts);
    return res.json({
      success: true,
      data: { _id: existing._id, name: existing.name, email: existing.email, role: existing.role, school: existing.school, avatar: existing.avatar, classe: existing.classe, serie: existing.serie },
      accessToken,
    });
  }

  if (role !== 'admin' && !schoolId) {
    return res.status(422).json({ success: false, message: 'Choisissez votre établissement' });
  }
  await createAccountAndRespond(res, {
    name: payload.name || email.split('@')[0],
    email,
    googleId: payload.sub,
    emailVerified: true,
    role, schoolId, classe, serie,
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ success: false, message: 'Email et mot de passe requis' });
  }
  const user = await User.findOne({ email }).select('+password +refreshToken').populate('school', 'name status logo phone email address');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: 'Identifiants incorrects' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ success: false, message: STATUS_MESSAGES[user.status] || 'Compte inactif' });
  }
  if (user.role === 'admin' && !user.emailVerified) {
    return res.status(403).json({ success: false, code: 'EMAIL_NOT_VERIFIED', message: 'Vérifiez votre email avant de vous connecter' });
  }
  if (user.school && user.school.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Votre établissement a été suspendu' });
  }

  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, cookieOpts);
  res.json({
    success: true,
    data: { _id: user._id, name: user.name, email: user.email, role: user.role, school: user.school, avatar: user.avatar, classe: user.classe, serie: user.serie },
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
      school: req.user.school,
      avatar: req.user.avatar,
      bio: req.user.bio,
      classe: req.user.classe,
      serie: req.user.serie,
    },
  });
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(422).json({ success: false, message: 'Token manquant' });
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpires: { $gt: Date.now() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) return res.status(400).json({ success: false, message: 'Lien invalide ou expiré' });

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.json({ success: true, message: 'Email vérifié avec succès' });
};

// Student picks their classe/serie (once) — auto-enrolls them in every matching published course
exports.setClasse = async (req, res) => {
  const { classe, serie } = req.body;
  if (!CLASSES.includes(classe) || (requiresSerie(classe) && !SERIES.includes(serie))) {
    return res.status(422).json({ success: false, message: 'Classe ou série invalide' });
  }
  const finalSerie = requiresSerie(classe) ? serie : null;

  const user = await User.findByIdAndUpdate(req.user._id, { classe, serie: finalSerie }, { new: true });
  await syncClassEnrollments(user._id, resolveSchoolId(req.user), classe, finalSerie);

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

exports.resendVerification = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  const generic = { success: true, message: "Si ce compte existe et n'est pas encore vérifié, un email a été envoyé" };
  if (!user || user.emailVerified) return res.json(generic);

  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  emailService.sendVerificationEmail(user, token).catch(() => {});
  res.json(generic);
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.json({ success: true, message: 'Si ce compte existe, un email a été envoyé' });

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  emailService.sendPasswordReset(user, token).catch(() => {});
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
