const COLLEGE_CLASSES = ['6ème', '5ème', '4ème', '3ème'];
const LYCEE_CLASSES = ['Seconde', 'Première', 'Terminale'];
const CLASSES = [...COLLEGE_CLASSES, ...LYCEE_CLASSES];
const SERIES = ['A4', 'D'];
const requiresSerie = (classe) => LYCEE_CLASSES.includes(classe);

module.exports = { COLLEGE_CLASSES, LYCEE_CLASSES, CLASSES, SERIES, requiresSerie };
