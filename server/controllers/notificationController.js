const Notification = require('../models/Notification');
const User = require('../models/User');

exports.list = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const unreadCount = notifications.filter((n) => !n.read).length;
  res.json({ success: true, data: notifications, unreadCount });
};

exports.readAll = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
};

exports.readOne = async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { read: true });
  res.json({ success: true });
};

exports.adminList = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
    User.countDocuments(),
  ]);
  res.json({ success: true, data: users, total });
};

exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['student', 'instructor', 'admin'].includes(role)) {
    return res.status(422).json({ success: false, message: 'Rôle invalide' });
  }
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).lean();
  if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
  res.json({ success: true, data: user });
};
