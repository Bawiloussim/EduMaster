import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../tests/testUtils';
import ImportStudentsModal from './ImportStudentsModal';
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
  return new File(['nom,email,classe,serie\nJean,jean@example.com,6ème,'], 'eleves.csv', { type: 'text/csv' });
}

describe('ImportStudentsModal', () => {
  test('le bouton Importer est désactivé sans fichier sélectionné', () => {
    renderWithProviders(<ImportStudentsModal open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Importer' })).toBeDisabled();
  });

  test('sélectionner un fichier active le bouton Importer', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportStudentsModal open onClose={() => {}} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());

    expect(screen.getByRole('button', { name: 'Importer' })).not.toBeDisabled();
  });

  test('importer affiche les élèves créés et les erreurs, et appelle onImported', async () => {
    api.post.mockResolvedValue({
      data: {
        data: {
          createdCount: 1,
          skippedCount: 1,
          created: [{ name: 'Jean', email: 'jean@example.com', tempPassword: 'abc123' }],
          errors: [{ row: 3, email: 'bad', reason: 'Email invalide' }],
        },
      },
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportStudentsModal open onClose={() => {}} onImported={onImported} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());
    await user.click(screen.getByRole('button', { name: 'Importer' }));

    await waitFor(() => expect(screen.getByText('1 élève(s) créé(s)')).toBeInTheDocument());
    expect(screen.getByText('1 ligne(s) ignorée(s)')).toBeInTheDocument();
    expect(screen.getByText(/Jean · jean@example.com/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  test('n\'appelle pas onImported si aucun élève créé', async () => {
    api.post.mockResolvedValue({
      data: { data: { createdCount: 0, skippedCount: 1, created: [], errors: [{ row: 2, email: 'x', reason: 'Doublon' }] } },
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportStudentsModal open onClose={() => {}} onImported={onImported} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());
    await user.click(screen.getByRole('button', { name: 'Importer' }));

    await waitFor(() => expect(screen.getByText('1 ligne(s) ignorée(s)')).toBeInTheDocument());
    expect(onImported).not.toHaveBeenCalled();
  });
});
