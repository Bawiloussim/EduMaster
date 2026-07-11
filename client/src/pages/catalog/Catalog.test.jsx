import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../tests/testUtils';
import Catalog from './Catalog';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { data: [], total: 0, pages: 1 } });
  useAuthStore.mockReset();
});

describe('Catalog — bandeau "ta classe" vs filtres', () => {
  test('élève de lycée avec classe et série : bandeau affiché, filtres masqués', async () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: 'Terminale', serie: 'D' } });
    renderWithProviders(<Catalog />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(screen.getByText(/Cours de ta classe/)).toBeInTheDocument();
    expect(screen.queryByText('Toutes les classes')).not.toBeInTheDocument();
  });

  test('élève de collège sans série : bandeau quand même affiché (pas de filtres)', async () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: '5ème', serie: null } });
    renderWithProviders(<Catalog />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(screen.getByText(/Cours de ta classe/)).toBeInTheDocument();
    expect(screen.getByText(/5ème/)).toBeInTheDocument();
    expect(screen.queryByText('Toutes les classes')).not.toBeInTheDocument();
  });

  test('élève de lycée sans série renseignée : filtres affichés (donnée incomplète, pas de bandeau)', async () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: 'Terminale', serie: null } });
    renderWithProviders(<Catalog />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(screen.queryByText(/Cours de ta classe/)).not.toBeInTheDocument();
    expect(screen.getByText('Toutes les classes')).toBeInTheDocument();
  });

  test('visiteur non connecté : filtres affichés', async () => {
    useAuthStore.mockReturnValue({ user: null });
    renderWithProviders(<Catalog />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(screen.getByText('Toutes les classes')).toBeInTheDocument();
  });

  test('formateur connecté : filtres affichés (isStudent exige le rôle student)', async () => {
    useAuthStore.mockReturnValue({ user: { role: 'instructor', classe: null } });
    renderWithProviders(<Catalog />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    expect(screen.getByText('Toutes les classes')).toBeInTheDocument();
  });
});
