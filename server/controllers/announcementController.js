const Announcement = require('../models/Announcement');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { CLASSES, SERIES, requiresSerie } = require('../constants/academic');

exports.create = async (req, res) => {
  const { title, body, audience = 'all', classe, serie } = req.body;

  if (!title || !body) {
    return res.status(422).json({ success: false, message: 'Titre et message requis' });
  }
  if (!['all', 'students', 'instructors', 'classe'].includes(audience)) {
    return res.status(422).json({ success: false, message: 'Audience invalide' });
  }
  if (audience === 'classe' && (!CLASSES.includes(classe) || (requiresSerie(classe) && !SERIES.includes(serie)))) {
    return res.status(422).json({ success: false, message: 'Classe ou série invalide' });
  }
  const finalSerie = audience === 'classe' && requiresSerie(classe) ? serie : null;

  const announcement = await Announcement.create({
    title, body, audience,
    classe: audience === 'classe' ? classe : null,
    serie: audience === 'classe' ? finalSerie : null,
    createdBy: req.user._id,
  });

  const filter = audience === 'all' ? { role: { $in: ['student', 'instructor'] } }
    : audience === 'students' ? { role: 'student' }
    : audience === 'instructors' ? { role: 'instructor' }
    : { role: 'student', classe, ...(finalSerie ? { serie: finalSerie } : {}) };

  const targetUsers = await User.find(filter).select('_id').lean();
  if (targetUsers.length) {
    await Notification.insertMany(targetUsers.map((u) => ({
      user: u._id,
      type: 'announcement',
      title,
      message: body,
      link: '/notifications',
    })));
  }

  res.status(201).json({ success: true, data: announcement, notifiedCount: targetUsers.length });
};

exports.list = async (req, res) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 }).populate('createdBy', 'name').lean();
  res.json({ success: true, data: announcements });
};
