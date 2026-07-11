export const COLLEGE_CLASSES = ['6ème', '5ème', '4ème', '3ème'];
export const LYCEE_CLASSES = ['Seconde', 'Première', 'Terminale'];
export const CLASSES = [...COLLEGE_CLASSES, ...LYCEE_CLASSES];
export const SERIES = ['A4', 'D'];
export const requiresSerie = (classe) => LYCEE_CLASSES.includes(classe);
