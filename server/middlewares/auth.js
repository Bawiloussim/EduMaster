const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Non autorisé, token manquant' });
  }
  const token = auth.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = await User.findById(decoded.id);
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Utilisateur introuvable' });
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

module.exports = { protect, optionalAuth };
