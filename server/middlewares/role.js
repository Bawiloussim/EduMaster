// superadmin supervises everything and bypasses any specific role restriction
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || (req.user.role !== 'superadmin' && !roles.includes(req.user.role))) {
    return res.status(403).json({ success: false, message: 'Accès interdit' });
  }
  next();
};

module.exports = requireRole;
