import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../tests/testUtils';
import ImportCoursesModal from './ImportCoursesModal';
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
  return new File(['matiere,classe,serie,email_formateur\nMaths,Terminale,D,prof@example.com'], 'cours.csv', { type: 'text/csv' });
}

describe('ImportCoursesModal', () => {
  test('le bouton Importer est désactivé sans fichier sélectionné', () => {
    renderWithProviders(<ImportCoursesModal open onClose={() => {}} />);
    expect(screen.getByRole('button', { name: 'Importer' })).toBeDisabled();
  });

  test('appelle POST /admin/import/courses et affiche le résumé (matière · classe · formateur)', async () => {
    api.post.mockResolvedValue({
      data: {
        data: {
          createdCount: 1,
          skippedCount: 0,
          created: [{ title: 'Maths', classe: 'Terminale', serie: 'D', formateur: 'Prof Test' }],
          errors: [],
        },
      },
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportCoursesModal open onClose={() => {}} onImported={onImported} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());
    await user.click(screen.getByRole('button', { name: 'Importer' }));

    await waitFor(() => expect(screen.getByText('1 cours créé(s)')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/admin/import/courses', expect.any(FormData), expect.anything());
    expect(screen.getByText(/Maths · Terminale · D · Prof Test/)).toBeInTheDocument();
    expect(onImported).toHaveBeenCalled();
  });

  test('affiche "Formateur introuvable" sans appeler onImported si rien n\'est créé', async () => {
    api.post.mockResolvedValue({
      data: { data: { createdCount: 0, skippedCount: 1, created: [], errors: [{ row: 2, email: 'inconnu@example.com', reason: 'Formateur introuvable' }] } },
    });
    const onImported = vi.fn();
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ImportCoursesModal open onClose={() => {}} onImported={onImported} />);

    const fileInput = container.querySelector('input[type="file"]');
    await user.upload(fileInput, makeCsvFile());
    await user.click(screen.getByRole('button', { name: 'Importer' }));

    await waitFor(() => expect(screen.getByText(/Formateur introuvable/)).toBeInTheDocument());
    expect(onImported).not.toHaveBeenCalled();
  });
});
