import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../tests/testUtils';
import ClassesTab from './ClassesTab';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: { get: vi.fn() },
}));

const CLASSES_FIXTURE = [
  { _id: 'c1', classe: '6ème', serie: null, studentsCount: 3, mainTeacher: null },
  { _id: 'c2', classe: '5ème', serie: null, studentsCount: 2, mainTeacher: null },
  { _id: 'c3', classe: '4ème', serie: null, studentsCount: 0, mainTeacher: null },
  { _id: 'c4', classe: '3ème', serie: null, studentsCount: 1, mainTeacher: null },
  { _id: 'c5', classe: 'Seconde', serie: 'A4', studentsCount: 0, mainTeacher: null },
  { _id: 'c6', classe: 'Terminale', serie: 'A4', studentsCount: 0, mainTeacher: null },
  { _id: 'c7', classe: 'Terminale', serie: 'D', studentsCount: 4, mainTeacher: { _id: 't1', name: 'Prof Test' } },
];

beforeEach(() => {
  api.get.mockReset().mockImplementation((url) => {
    if (url === '/classes') return Promise.resolve({ data: { data: CLASSES_FIXTURE } });
    if (url === '/admin/instructors') return Promise.resolve({ data: { data: [{ _id: 't1', name: 'Prof Test' }] } });
    return Promise.resolve({ data: { data: [] } });
  });
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

  test('le total élèves par section correspond à la somme des lignes', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Collège')).toBeInTheDocument());

    const collegeSection = screen.getByText('Collège').closest('div.bg-white');
    // total élèves collège = 3+2+0+1 = 6
    expect(within(collegeSection).getByText('6', { selector: 'span.text-xl' })).toBeInTheDocument();
  });

  test('affiche le professeur principal déjà affecté', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Lycée')).toBeInTheDocument());
    expect(screen.getByDisplayValue('Prof Test')).toBeInTheDocument();
  });
});
