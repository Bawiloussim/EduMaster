export { COLLEGE_CLASSES, LYCEE_CLASSES, CLASSES, SERIES, requiresSerie } from '../constants/academic';

export const SERIE_LABELS = {
  A4: 'Série A4 — Littéraire',
  D:  'Série D — Scientifique',
};

export const SUBJECTS_BY_SERIE = {
  A4: ['Philosophie', 'Histoire-Géographie', 'Anglais', 'Français', 'Latin', 'Économie', 'Mathématiques'],
  D:  ['Mathématiques', 'SVT', 'Physique', 'Chimie', 'Anglais', 'Français', 'Informatique'],
};

export const SUBJECTS_COLLEGE = ['Français', 'Mathématiques', 'Histoire-Géographie', 'SVT', 'Anglais', 'EPS', 'Arts Plastiques', 'Éducation Musicale', 'Technologie'];

export const ALL_SUBJECTS = [...new Set([...SUBJECTS_BY_SERIE.A4, ...SUBJECTS_BY_SERIE.D, ...SUBJECTS_COLLEGE])].sort();

export const SERIE_COLORS = { A4: 'purple', D: 'blue' };
export const CLASSE_COLORS = {
  '6ème': 'teal', '5ème': 'cyan', '4ème': 'indigo', '3ème': 'pink',
  Seconde: 'green', Première: 'yellow', Terminale: 'red',
};
