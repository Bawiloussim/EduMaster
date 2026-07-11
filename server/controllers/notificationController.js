const Notification = require('../models/Notification');

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
