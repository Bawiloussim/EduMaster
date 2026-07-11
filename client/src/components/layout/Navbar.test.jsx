import { vi, describe, test, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../tests/testUtils';
import Navbar from './Navbar';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: () => ({ user: null }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}));

beforeEach(() => {
  api.get.mockReset().mockResolvedValue({ data: { unreadCount: 0 } });
});

describe('Navbar — dropdown Classes (desktop)', () => {
  test('une classe de collège est un lien direct sans paramètre serie', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar />);

    await user.click(screen.getByRole('button', { name: /Classes/ }));

    const link = screen.getByRole('link', { name: '6ème' });
    expect(link).toHaveAttribute('href', '/catalog?classe=6%C3%A8me');
    expect(link.getAttribute('href')).not.toContain('serie');
  });

  test('une classe de lycée propose un sous-menu par série', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar />);

    await user.click(screen.getByRole('button', { name: /Classes/ }));

    expect(screen.getByText('Terminale')).toBeInTheDocument();
    const serieD = screen.getAllByRole('link', { name: /Série D/ })[0];
    const serieA4 = screen.getAllByRole('link', { name: /Série A4/ })[0];
    expect(serieD).toHaveAttribute('href', expect.stringContaining('serie=D'));
    expect(serieA4).toHaveAttribute('href', expect.stringContaining('serie=A4'));
  });

  test('aucun lien collège ne contient "Série"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Navbar />);

    await user.click(screen.getByRole('button', { name: /Classes/ }));

    ['6ème', '5ème', '4ème', '3ème'].forEach((c) => {
      const link = screen.getByRole('link', { name: c });
      expect(link.textContent).not.toMatch(/Série/);
    });
  });
});
