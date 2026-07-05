import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { GraduationCap, Bell, Menu, X, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

export default function Navbar() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unread = notifData?.unreadCount || 0;

  const dashboardLink = user?.role === 'admin' ? '/admin' : user?.role === 'instructor' ? '/instructor' : '/student';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-blue-700">
            <GraduationCap className="h-7 w-7" />
            EduMaster
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link to="/catalog" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Catalogue</Link>
            {user && (
              <Link to={dashboardLink} className="text-sm text-gray-600 hover:text-blue-600 transition-colors">Dashboard</Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Bell className="h-5 w-5 text-gray-600" />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden">
                      {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.name[0].toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700">{user.name}</span>
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                      <Link to="/profile" onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Mon profil</Link>
                      <Link to={dashboardLink} onClick={() => setUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
                      <hr className="my-1" />
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Déconnexion</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600 px-3 py-2 rounded-lg transition-colors">Connexion</Link>
                <Link to="/register" className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">S'inscrire</Link>
              </div>
            )}
            <button onClick={() => setMenuOpen((v) => !v)} className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          <Link to="/catalog" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2">Catalogue</Link>
          {user && <Link to={dashboardLink} onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2">Dashboard</Link>}
        </div>
      )}
    </nav>
  );
}
