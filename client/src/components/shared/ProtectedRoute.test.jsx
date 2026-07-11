import { vi, describe, test, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('../../store/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

function renderProtected(path, roles) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ProtectedRoute roles={roles} />}>
          <Route path="/" element={<div>Zone Protégée</div>} />
          <Route path="/choose-class" element={<div>Choisir sa classe</div>} />
        </Route>
        <Route path="/login" element={<div>Page Connexion</div>} />
        <Route path="/home" element={<div>Page Accueil</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  useAuthStore.mockReset();
});

describe('ProtectedRoute', () => {
  test('redirige vers /login si non connecté', () => {
    useAuthStore.mockReturnValue({ user: null });
    renderProtected('/', undefined);
    expect(screen.getByText('Page Connexion')).toBeInTheDocument();
  });

  test('redirige vers /home si le rôle n\'est pas autorisé', () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: 'Terminale' } });
    renderProtected('/', ['admin']);
    expect(screen.getByText('Page Accueil')).toBeInTheDocument();
  });

  test('le superadmin bypass toute restriction de rôle', () => {
    useAuthStore.mockReturnValue({ user: { role: 'superadmin', classe: null } });
    renderProtected('/', ['admin']);
    expect(screen.getByText('Zone Protégée')).toBeInTheDocument();
  });

  test('un élève sans classe est redirigé vers /choose-class', () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: null } });
    renderProtected('/', undefined);
    expect(screen.getByText('Choisir sa classe')).toBeInTheDocument();
  });

  test('un élève sans classe déjà sur /choose-class n\'est pas redirigé en boucle', () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: null } });
    renderProtected('/choose-class', undefined);
    expect(screen.getByText('Choisir sa classe')).toBeInTheDocument();
  });

  test('un élève de collège (sans série) avec une classe renseignée accède normalement', () => {
    useAuthStore.mockReturnValue({ user: { role: 'student', classe: '6ème', serie: null } });
    renderProtected('/', undefined);
    expect(screen.getByText('Zone Protégée')).toBeInTheDocument();
  });

  test('cas nominal : rôle autorisé, accès direct', () => {
    useAuthStore.mockReturnValue({ user: { role: 'instructor' } });
    renderProtected('/', ['instructor', 'admin']);
    expect(screen.getByText('Zone Protégée')).toBeInTheDocument();
  });
});
