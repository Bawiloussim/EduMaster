const User = require('../models/User');
const { computeStudentBulletin } = require('./evaluationController');
const { requiresSerie } = require('../constants/academic');

exports.getPalmares = async (req, res) => {
  const { classe, serie, trimestre } = req.query;
  if (!classe || !trimestre) {
    return res.status(422).json({ success: false, message: 'classe et trimestre sont requis' });
  }
  if (requiresSerie(classe) && !serie) {
    return res.status(422).json({ success: false, message: 'serie est requise pour cette classe' });
  }

  const filter = { role: 'student', classe };
  if (requiresSerie(classe)) filter.serie = serie;
  const students = await User.find(filter)
    .select('_id name email avatar').lean();

  const withAverages = await Promise.all(students.map(async (student) => {
    const { moyenneGenerale } = await computeStudentBulletin(student._id, trimestre);
    return { student, moyenneGenerale };
  }));

  const ranked = withAverages.filter((s) => s.moyenneGenerale !== null)
    .sort((a, b) => b.moyenneGenerale - a.moyenneGenerale)
    .map((s, i) => ({ rang: i + 1, student: s.student, moyenneGenerale: s.moyenneGenerale }));

  const unranked = withAverages.filter((s) => s.moyenneGenerale === null)
    .map((s) => ({ rang: null, student: s.student, moyenneGenerale: null }));

  res.json({
    success: true,
    data: { classe, serie: requiresSerie(classe) ? serie : null, trimestre: parseInt(trimestre), ranking: [...ranked, ...unranked] },
  });
};
