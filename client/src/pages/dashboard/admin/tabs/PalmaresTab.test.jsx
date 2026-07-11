import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../tests/testUtils';
import PalmaresTab from './PalmaresTab';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: { get: vi.fn() },
}));

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { data: { ranking: [] } } });
});

describe('PalmaresTab', () => {
  test('la classe par défaut est le collège : pas de select série', async () => {
    renderWithProviders(<PalmaresTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getAllByRole('combobox')).toHaveLength(2); // classe + trimestre, pas de série
  });

  test('l\'appel API pour une classe de collège ne contient pas de serie', async () => {
    renderWithProviders(<PalmaresTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const [, options] = api.get.mock.calls[0];
    expect(options.params.classe).toBe('6ème');
    expect(options.params.serie).toBeUndefined();
  });

  test('sélectionner une classe de lycée fait apparaître le select série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PalmaresTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const [classeSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(classeSelect, 'Terminale');

    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(3));
  });

  test('l\'appel API pour une classe de lycée contient la serie choisie', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PalmaresTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    const [classeSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(classeSelect, 'Terminale');

    await waitFor(() => {
      const lastCall = api.get.mock.calls.at(-1);
      expect(lastCall[1].params.classe).toBe('Terminale');
      expect(lastCall[1].params.serie).toBeDefined();
    });
  });
});
