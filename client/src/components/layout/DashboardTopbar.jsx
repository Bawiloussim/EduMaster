import { useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronDown, LayoutDashboard, User, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const ROLE_META = {
  superadmin: { label: 'Super Admin', badge: 'bg-danger-light text-danger' },
  admin: { label: 'Admin', badge: 'bg-danger-light text-danger' },
  instructor: { label: 'Formateur', badge: 'bg-purple-100 text-purple-700' },
  student: { label: 'Élève', badge: 'bg-brand/15 text-brand-dark' },
};

/** Generic topbar shared by the admin, instructor and student spaces. */
export default function DashboardTopbar({ title, onMenuClick }) {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const role = ROLE_META[user?.role] || ROLE_META.student;

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unread = notifData?.unreadCount || 0;

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 h-16 flex items-center gap-4 px-4 sm:px-6">
      <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600">
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>

      <div className="flex items-center gap-2 ml-auto">
        <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="relative" ref={userMenuRef}>
          <button onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-brand transition-colors bg-white">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0">
              {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user?.name?.[0]?.toUpperCase()}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">{user?.name}</span>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
              <div className="px-4 py-2 border-b border-gray-50 mb-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${role.badge}`}>
                  {role.label}
                </span>
              </div>
              <Link to="/home" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <LayoutDashboard className="h-4 w-4 text-gray-400" /> Accueil du site
              </Link>
              <Link to="/profile" onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <User className="h-4 w-4 text-gray-400" /> Mon profil
              </Link>
              <hr className="my-1 border-gray-100" />
              <button onClick={async () => { await logout(); navigate('/'); setUserMenuOpen(false); }}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-danger hover:bg-danger-light transition-colors">
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
