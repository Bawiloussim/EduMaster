import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../tests/testUtils';
import ClassesTab from './ClassesTab';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: { get: vi.fn() },
}));

const FIXTURE = [
  { classe: '6ème', serie: null, studentsCount: 3, coursesCount: 1 },
  { classe: '5ème', serie: null, studentsCount: 2, coursesCount: 0 },
  { classe: '4ème', serie: null, studentsCount: 0, coursesCount: 0 },
  { classe: '3ème', serie: null, studentsCount: 1, coursesCount: 2 },
  { classe: 'Seconde', serie: 'A4', studentsCount: 0, coursesCount: 0 },
  { classe: 'Seconde', serie: 'D', studentsCount: 5, coursesCount: 1 },
  { classe: 'Première', serie: 'A4', studentsCount: 0, coursesCount: 0 },
  { classe: 'Première', serie: 'D', studentsCount: 0, coursesCount: 0 },
  { classe: 'Terminale', serie: 'A4', studentsCount: 0, coursesCount: 0 },
  { classe: 'Terminale', serie: 'D', studentsCount: 4, coursesCount: 0 },
];

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { data: FIXTURE } });
});

describe('ClassesTab', () => {
  test('affiche deux sections Collège et Lycée', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => {
      expect(screen.getByText('Collège')).toBeInTheDocument();
      expect(screen.getByText('Lycée')).toBeInTheDocument();
    });
  });

  test('la table collège n\'a pas de colonne Série et liste les 4 niveaux', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Collège')).toBeInTheDocument());

    const collegeSection = screen.getByText('Collège').closest('div.bg-white');
    expect(within(collegeSection).queryByText('Série')).not.toBeInTheDocument();
    ['6ème', '5ème', '4ème', '3ème'].forEach((c) => {
      expect(within(collegeSection).getByText(c)).toBeInTheDocument();
    });
  });

  test('la table lycée fusionne la cellule Classe sur ses deux séries (rowSpan)', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Lycée')).toBeInTheDocument());

    const lyceeSection = screen.getByText('Lycée').closest('div.bg-white');
    // "Terminale" doit apparaître une seule fois dans le tableau (cellule fusionnée), pas deux
    expect(within(lyceeSection).getAllByText('Terminale')).toHaveLength(1);
    const terminaleCell = within(lyceeSection).getByText('Terminale');
    expect(terminaleCell.closest('td')).toHaveAttribute('rowspan', '2');
  });

  test('les totaux par section correspondent à la somme des lignes', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Collège')).toBeInTheDocument());

    const collegeSection = screen.getByText('Collège').closest('div.bg-white');
    // total élèves collège = 3+2+0+1 = 6, total cours = 1+0+0+2 = 3
    // (le total d'en-tête a la classe text-xl, contrairement aux pastilles de valeur par ligne qui sont en text-sm, pour éviter toute ambiguïté)
    expect(within(collegeSection).getByText('6', { selector: 'span.text-xl' })).toBeInTheDocument();
    expect(within(collegeSection).getByText('3', { selector: 'span.text-xl' })).toBeInTheDocument();
  });
});
