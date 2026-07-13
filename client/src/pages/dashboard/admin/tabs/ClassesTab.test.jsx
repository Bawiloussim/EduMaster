import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '../../../../tests/testUtils';
import ClassesTab from './ClassesTab';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const CLASSES_FIXTURE = [
  { _id: 'c1', classe: '6ème', serie: null, mainTeacher: null, studentsCount: 3 },
  { _id: 'c2', classe: '3ème', serie: null, mainTeacher: null, studentsCount: 1 },
  { _id: 'c3', classe: 'Seconde', serie: 'A4', mainTeacher: null, studentsCount: 0 },
  { _id: 'c4', classe: 'Terminale', serie: 'A4', mainTeacher: null, studentsCount: 0 },
  { _id: 'c5', classe: 'Terminale', serie: 'D', mainTeacher: { _id: 't1', name: 'Prof Martin' }, studentsCount: 4 },
];

beforeEach(() => {
  api.get.mockReset().mockImplementation((url) => {
    if (url === '/classes') return Promise.resolve({ data: { data: CLASSES_FIXTURE } });
    if (url === '/admin/instructors') return Promise.resolve({ data: { data: [{ _id: 't1', name: 'Prof Martin' }] } });
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

  test('la table collège n\'a pas de colonne Série et liste ses niveaux', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Collège')).toBeInTheDocument());

    const collegeSection = screen.getByText('Collège').closest('div.bg-white');
    expect(within(collegeSection).queryByText('Série')).not.toBeInTheDocument();
    ['6ème', '3ème'].forEach((c) => {
      expect(within(collegeSection).getByText(c)).toBeInTheDocument();
    });
  });

  test('la table lycée fusionne la cellule Classe sur ses séries (rowSpan)', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Lycée')).toBeInTheDocument());

    const lyceeSection = screen.getByText('Lycée').closest('div.bg-white');
    expect(within(lyceeSection).getAllByText('Terminale')).toHaveLength(1);
    const terminaleCell = within(lyceeSection).getByText('Terminale');
    expect(terminaleCell.closest('td')).toHaveAttribute('rowspan', '2');
  });

  test('le professeur principal affecté est présélectionné dans le menu déroulant', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Lycée')).toBeInTheDocument());

    const select = await screen.findByDisplayValue('Prof Martin');
    expect(select).toBeInTheDocument();
  });

  test('le total élèves du collège correspond à la somme des lignes', async () => {
    renderWithProviders(<ClassesTab />);
    await waitFor(() => expect(screen.getByText('Collège')).toBeInTheDocument());

    const collegeSection = screen.getByText('Collège').closest('div.bg-white');
    // total élèves collège = 3 + 1 = 4
    expect(within(collegeSection).getByText('4', { selector: 'span.text-xl' })).toBeInTheDocument();
  });

  test('affiche un message quand aucune classe n\'existe', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/classes') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
    renderWithProviders(<ClassesTab />);
    await waitFor(() => {
      expect(screen.getAllByText('Aucune classe créée').length).toBe(2);
    });
  });
});
