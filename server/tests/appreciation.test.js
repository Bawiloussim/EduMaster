const { getAppreciation } = require('../utils/appreciation');

describe('getAppreciation', () => {
  test.each([
    [0, 'Très insuffisant'],
    [4, 'Très insuffisant'],
    [5, 'Insuffisant'],
    [9, 'Insuffisant'],
    [10, 'Passable'],
    [11, 'Passable'],
    [12, 'Assez bien'],
    [13, 'Assez bien'],
    [14, 'Bien'],
    [15, 'Bien'],
    [16, 'Très bien'],
    [17, 'Très bien'],
    [18, 'Excellent'],
    [19, 'Excellent'],
    [20, 'Honorable'],
  ])('%d/20 → %s', (note, expected) => {
    expect(getAppreciation(note)).toBe(expected);
  });

  test('retourne une chaîne vide sans note', () => {
    expect(getAppreciation(null)).toBe('');
    expect(getAppreciation(undefined)).toBe('');
  });
});
