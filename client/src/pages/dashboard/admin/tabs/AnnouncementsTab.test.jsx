import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../tests/testUtils';
import AnnouncementsTab from './AnnouncementsTab';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { data: [] } });
  api.post.mockReset().mockResolvedValue({ data: { notifiedCount: 0 } });
});

async function fillTitleAndBody(user) {
  const [titleInput, bodyTextarea] = screen.getAllByRole('textbox');
  await user.type(titleInput, 'Titre test');
  await user.type(bodyTextarea, 'Message test');
}

describe('AnnouncementsTab', () => {
  test('audience "Classe précise" avec la classe par défaut (collège) : pas de select série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementsTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'classe');
    // 3 selects attendus : Audience, Classe, Trimestre absent ici -> juste Audience + Classe
    expect(screen.getAllByRole('combobox')).toHaveLength(2);
  });

  test('choisir une classe de lycée fait apparaître le select série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementsTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'classe');
    const selects = screen.getAllByRole('combobox');
    const classeSelect = selects[1];
    await user.selectOptions(classeSelect, 'Terminale');

    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(3));
  });

  test('soumettre avec une classe de collège n\'inclut pas de serie dans le payload', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementsTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'classe');
    const classeSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(classeSelect, '3ème');

    await fillTitleAndBody(user);
    await user.click(screen.getByRole('button', { name: /Envoyer l'annonce/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const [, payload] = api.post.mock.calls[0];
    expect(payload.classe).toBe('3ème');
    expect(payload.serie).toBeUndefined();
  });

  test('soumettre avec une classe de lycée inclut la serie choisie', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementsTab />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    await user.selectOptions(screen.getAllByRole('combobox')[0], 'classe');
    let selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[1], 'Première');

    selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[2], 'A4');

    await fillTitleAndBody(user);
    await user.click(screen.getByRole('button', { name: /Envoyer l'annonce/ }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    const [, payload] = api.post.mock.calls[0];
    expect(payload.classe).toBe('Première');
    expect(payload.serie).toBe('A4');
  });
});
