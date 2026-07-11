import { describe, test, expect } from 'vitest';
import { CLASSES, COLLEGE_CLASSES, LYCEE_CLASSES, requiresSerie, CLASSE_COLORS, SUBJECTS_BY_SERIE, SUBJECTS_COLLEGE } from './schoolData';

describe('schoolData', () => {
  test('requiresSerie est vrai uniquement pour le lycée', () => {
    LYCEE_CLASSES.forEach((c) => expect(requiresSerie(c)).toBe(true));
    COLLEGE_CLASSES.forEach((c) => expect(requiresSerie(c)).toBe(false));
  });

  test('CLASSE_COLORS a une couleur pour chaque classe', () => {
    CLASSES.forEach((c) => expect(CLASSE_COLORS[c]).toBeDefined());
  });

  test('SUBJECTS_BY_SERIE (A4, D) et SUBJECTS_COLLEGE sont non vides', () => {
    expect(SUBJECTS_BY_SERIE.A4.length).toBeGreaterThan(0);
    expect(SUBJECTS_BY_SERIE.D.length).toBeGreaterThan(0);
    expect(SUBJECTS_COLLEGE.length).toBeGreaterThan(0);
  });
});
