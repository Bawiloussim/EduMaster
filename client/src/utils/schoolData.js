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

// Broader catalogue of subjects taught in secondary schools around the world —
// used only as suggestions when a school builds its own subject catalogue
// (SubjectsManager), independent from SUBJECTS_BY_SERIE/SUBJECTS_COLLEGE
// which drive the Cameroonian curriculum's course-creation dropdowns.
export const WORLD_SECONDARY_SUBJECTS = [
  // Sciences
  'Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Sciences de la Vie et de la Terre (SVT)',
  'Sciences Naturelles', 'Sciences Physiques', 'Sciences de l\'Ingénieur', 'Astronomie',
  'Géologie', 'Écologie et Environnement', 'Statistiques', 'Informatique', 'Programmation', 'Robotique',
  // Langues
  'Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Portugais', 'Arabe',
  'Chinois (Mandarin)', 'Japonais', 'Russe', 'Latin', 'Grec Ancien', 'Langues Nationales',
  // Humanités
  'Histoire', 'Géographie', 'Histoire-Géographie', 'Philosophie', 'Éducation Civique et Morale',
  'Instruction Civique', 'Économie', 'Sciences Économiques et Sociales (SES)', 'Droit',
  'Sociologie', 'Psychologie', 'Littérature', 'Communication', 'Journalisme',
  // Arts
  'Arts Plastiques', 'Éducation Musicale', 'Théâtre', 'Danse', 'Cinéma et Audiovisuel', 'Design',
  // Sport, santé, religion
  'Éducation Physique et Sportive (EPS)', 'Éducation à la Santé', 'Éducation Religieuse', 'Études Islamiques',
  // Technique / professionnel
  'Technologie', 'Comptabilité', 'Gestion', 'Commerce', 'Marketing', 'Agriculture',
  'Couture et Mode', 'Menuiserie', 'Électricité et Électrotechnique', 'Mécanique Auto',
  'Génie Civil et BTP', 'Hôtellerie-Restauration', 'Secrétariat et Bureautique',
];

export const ALL_SUBJECTS = [...new Set([
  ...SUBJECTS_BY_SERIE.A4, ...SUBJECTS_BY_SERIE.D, ...SUBJECTS_COLLEGE, ...WORLD_SECONDARY_SUBJECTS,
])].sort();

export const SERIE_COLORS = { A4: 'purple', D: 'blue' };
export const CLASSE_COLORS = {
  '6ème': 'teal', '5ème': 'cyan', '4ème': 'indigo', '3ème': 'pink',
  Seconde: 'green', Première: 'yellow', Terminale: 'red',
};
