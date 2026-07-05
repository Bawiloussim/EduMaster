export const CLASSES = ['Seconde', 'Première', 'Terminale'];
export const SERIES = ['A4', 'D'];

export const SERIE_LABELS = {
  A4: 'Série A4 — Littéraire',
  D:  'Série D — Scientifique',
};

export const SUBJECTS_BY_SERIE = {
  A4: ['Philosophie', 'Histoire-Géographie', 'Anglais', 'Français', 'Latin', 'Économie', 'Mathématiques'],
  D:  ['Mathématiques', 'SVT', 'Physique', 'Chimie', 'Anglais', 'Français', 'Informatique'],
};

export const ALL_SUBJECTS = [...new Set([...SUBJECTS_BY_SERIE.A4, ...SUBJECTS_BY_SERIE.D])].sort();

export const SERIE_COLORS = { A4: 'purple', D: 'blue' };
export const CLASSE_COLORS = { Seconde: 'green', Première: 'yellow', Terminale: 'red' };
