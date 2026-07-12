import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../tests/testUtils';
import ImportInstructorsModal from './ImportInstructorsModal';
import api from '../../../../services/api';

vi.mock('../../../../services/api', () => ({
  default: { post: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

beforeEach(() => {
  api.post.mockReset();
});

function makeCsvFile() {
  return new File(['nom,email\nJean Prof,jean.prof@example.com'], 'formateurs.csv', { type: 'text/csv' });
}

describe('ImportInstructorsModal', () => {
  test('le bouton Importer est désactivé sans fichier sélectionné', () => {
    renderWithProviders(<ImportInstructorsModal open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Importer' })).toBeDisabled();
  });

  test('appelle POST /admin/import/instructors et affiche le résumé', async () => {
    api.post.mockResolvedValue({
      data: {
        data: {
          createdCount: 1,
          skippedCount: 0,
          created: [{ name: 'Jean Prof', email: 'jean.prof@example.com', tempPassword: 'xyz789' }],
          errors: [],
        },
      },
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportInstructorsModal open onClose={() => {}} onImported={onImported} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());
    await user.click(screen.getByRole('button', { name: 'Importer' }));

    await waitFor(() => expect(screen.getByText('1 formateur(s) créé(s)')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/admin/import/instructors', expect.any(FormData), expect.anything());
    expect(screen.getByText(/Jean Prof · jean.prof@example.com/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  test('affiche les erreurs sans appeler onImported si rien n\'est créé', async () => {
    api.post.mockResolvedValue({
      data: { data: { createdCount: 0, skippedCount: 1, created: [], errors: [{ row: 2, email: 'x', reason: 'Compte déjà existant' }] } },
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportInstructorsModal open onClose={() => {}} onImported={onImported} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());
    await user.click(screen.getByRole('button', { name: 'Importer' }));

    await waitFor(() => expect(screen.getByText('1 ligne(s) ignorée(s)')).toBeInTheDocument());
    expect(onImported).not.toHaveBeenCalled();
  });
});
