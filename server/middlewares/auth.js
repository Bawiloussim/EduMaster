const jwt = require('jsonwebtoken');
const User = require('../models/User');

const STATUS_MESSAGES = {
  suspended: 'Votre compte a été suspendu',
};

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Non autorisé, token manquant' });
  }
  const token = auth.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide ou expiré' });
  }
  req.user = await User.findById(decoded.id).populate('school', 'name status logo phone email address');
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
  }
  if (req.user.status !== 'active') {
    return res.status(403).json({ success: false, message: STATUS_MESSAGES[req.user.status] || 'Compte inactif' });
  }
  if (req.user.school && req.user.school.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Votre établissement a été suspendu' });
  }
  next();
};

const optionalAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    }
  } catch {
    // continue without user
  }
  next();
};

module.exports = { protect, optionalAuth, STATUS_MESSAGES };
