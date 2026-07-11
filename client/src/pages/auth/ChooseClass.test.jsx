import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../tests/testUtils';
import ChooseClass from './ChooseClass';

const mockSetClasse = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { name: 'Test Élève' }, setClasse: mockSetClasse }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  mockSetClasse.mockReset().mockResolvedValue({});
  mockNavigate.mockReset();
});

describe('ChooseClass', () => {
  test('affiche les 7 classes (4 collège + 3 lycée)', () => {
    renderWithProviders(<ChooseClass />);
    ['6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale'].forEach((c) => {
      expect(screen.getByRole('button', { name: c })).toBeInTheDocument();
    });
  });

  test('sélectionner une classe de lycée affiche le bloc série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChooseClass />);
    expect(screen.queryByText('Ma série')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Terminale' }));
    expect(screen.getByText('Ma série')).toBeInTheDocument();
  });

  test('sélectionner une classe de collège masque le bloc série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChooseClass />);

    await user.click(screen.getByRole('button', { name: 'Terminale' }));
    expect(screen.getByText('Ma série')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '6ème' }));
    expect(screen.queryByText('Ma série')).not.toBeInTheDocument();
  });

  test('soumettre une classe de collège seule appelle setClasse sans série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChooseClass />);

    await user.click(screen.getByRole('button', { name: '6ème' }));
    await user.click(screen.getByRole('button', { name: 'Valider ma classe' }));

    await waitFor(() => expect(mockSetClasse).toHaveBeenCalledWith('6ème', null));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/student'));
  });

  test('soumettre une classe de lycée avec sa série appelle setClasse correctement', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChooseClass />);

    await user.click(screen.getByRole('button', { name: 'Terminale' }));
    await user.click(screen.getByRole('button', { name: /Série D/ }));
    await user.click(screen.getByRole('button', { name: 'Valider ma classe' }));

    await waitFor(() => expect(mockSetClasse).toHaveBeenCalledWith('Terminale', 'D'));
  });

  test('soumettre une classe de lycée sans série ne fait rien', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ChooseClass />);

    await user.click(screen.getByRole('button', { name: 'Terminale' }));
    await user.click(screen.getByRole('button', { name: 'Valider ma classe' }));

    expect(mockSetClasse).not.toHaveBeenCalled();
  });
});
