function getAppreciation(note) {
  if (note === null || note === undefined) return '';
  if (note >= 20) return 'Honorable';
  if (note >= 18) return 'Excellent';
  if (note >= 16) return 'Très bien';
  if (note >= 14) return 'Bien';
  if (note >= 12) return 'Assez bien';
  if (note >= 10) return 'Passable';
  if (note >= 5) return 'Insuffisant';
  return 'Très insuffisant';
}

module.exports = { getAppreciation };
