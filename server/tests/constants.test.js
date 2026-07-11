const { CLASSES, COLLEGE_CLASSES, LYCEE_CLASSES, SERIES, requiresSerie } = require('../constants/academic');

describe('constants/academic', () => {
  test('collège et lycée ne se chevauchent pas', () => {
    const overlap = COLLEGE_CLASSES.filter((c) => LYCEE_CLASSES.includes(c));
    expect(overlap).toEqual([]);
  });

  test('CLASSES = collège + lycée, sans doublon', () => {
    expect(CLASSES).toEqual([...COLLEGE_CLASSES, ...LYCEE_CLASSES]);
    expect(new Set(CLASSES).size).toBe(CLASSES.length);
  });

  test('requiresSerie est vrai uniquement pour le lycée', () => {
    LYCEE_CLASSES.forEach((c) => expect(requiresSerie(c)).toBe(true));
    COLLEGE_CLASSES.forEach((c) => expect(requiresSerie(c)).toBe(false));
  });

  test('requiresSerie retourne false pour une classe inconnue', () => {
    expect(requiresSerie('Inexistante')).toBe(false);
    expect(requiresSerie(undefined)).toBe(false);
  });

  test('SERIES contient A4 et D', () => {
    expect(SERIES).toEqual(expect.arrayContaining(['A4', 'D']));
  });
});
