import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../tests/testUtils';
import InstructorDashboard from './InstructorDashboard';
import api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({
    data: { data: { coursesCount: 0, totalStudents: 0, avgPassRate: 0, pendingGradingCount: 0, courses: [] } },
  });
  api.post.mockReset();
  mockNavigate.mockReset();
});

async function openModal(user) {
  renderWithProviders(<InstructorDashboard />);
  const createButton = await screen.findByRole('button', { name: /Nouveau cours/ });
  await user.click(createButton);
  expect(screen.getByText('Classe')).toBeInTheDocument();
}

describe('InstructorDashboard — CreateCourseModal', () => {
  test('la classe par défaut (Seconde, lycée) affiche le bloc Série', async () => {
    const user = userEvent.setup();
    await openModal(user);
    expect(screen.getByText('Série')).toBeInTheDocument();
  });

  test('sélectionner une classe de collège masque le bloc Série', async () => {
    const user = userEvent.setup();
    await openModal(user);

    await user.click(screen.getByRole('button', { name: '6ème' }));
    expect(screen.queryByText('Série')).not.toBeInTheDocument();
  });

  test('créer un cours de collège envoie serie: null', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { _id: 'course-1' } } });
    const user = userEvent.setup();
    await openModal(user);

    await user.click(screen.getByRole('button', { name: '6ème' }));
    await user.type(screen.getByPlaceholderText('Ou saisir une autre matière…'), 'Français');
    await user.click(screen.getByRole('button', { name: /Suivant/ }));
    await user.click(screen.getByRole('button', { name: 'Créer le cours' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/courses', expect.objectContaining({
      classe: '6ème', serie: null, subject: 'Français',
    })));
  });

  test('créer un cours de lycée envoie la série choisie', async () => {
    api.post.mockResolvedValueOnce({ data: { data: { _id: 'course-2' } } });
    const user = userEvent.setup();
    await openModal(user);

    // Seconde est déjà sélectionnée par défaut ; on choisit la série A4
    await user.click(screen.getByRole('button', { name: /Série A4/ }));
    await user.type(screen.getByPlaceholderText('Ou saisir une autre matière…'), 'Philosophie');
    await user.click(screen.getByRole('button', { name: /Suivant/ }));
    await user.click(screen.getByRole('button', { name: 'Créer le cours' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/courses', expect.objectContaining({
      classe: 'Seconde', serie: 'A4', subject: 'Philosophie',
    })));
  });
});
