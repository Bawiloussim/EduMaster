import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, X, ChevronDown, GraduationCap, BookOpen, LayoutDashboard, LogOut, User } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { CLASSES, requiresSerie } from '../../utils/schoolData';

export default function Navbar() {
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [classesOpen, setClassesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const userMenuRef = useRef(null);
  const classesRef = useRef(null);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then(r => r.data),
    enabled: !!user,
    refetchInterval: 30000,
  });
  const unread = notifData?.unreadCount || 0;
  const dashLink = ['admin', 'superadmin'].includes(user?.role) ? '/admin' : user?.role === 'instructor' ? '/instructor' : '/student';

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
      if (classesRef.current && !classesRef.current.contains(e.target)) setClassesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/catalog?search=${encodeURIComponent(searchVal.trim())}`);
    setSearchOpen(false);
    setSearchVal('');
  };

  const navLink = (to, label) => (
    <Link to={to}
      className={`text-sm font-medium transition-colors px-2 py-1 rounded ${location.pathname === to ? 'text-brand' : 'text-gray-700 hover:text-brand'}`}>
      {label}
    </Link>
  );

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">

          {/* Logo */}
          <Link to={user ? '/home' : '/'} className="flex items-center gap-2 shrink-0 mr-4">
            <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-brand" />
              
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="font-extrabold text-primary text-lg leading-none block">Edu</span>
              <span className="font-extrabold text-brand text-lg leading-none block -mt-1">Master</span>
            </div>
          </Link>

          {/* Nav links — desktop */}
          <div className="hidden md:flex items-center gap-1 flex-1">
            {navLink('/home', 'Accueil')}
            {navLink('/catalog', 'Catalogue')}

            {/* Classes dropdown */}
            <div className="relative" ref={classesRef}>
              <button onClick={() => setClassesOpen(v => !v)}
                className="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-brand px-2 py-1 rounded transition-colors">
                Classes <ChevronDown className={`h-3.5 w-3.5 transition-transform ${classesOpen ? 'rotate-180' : ''}`} />
              </button>
              {classesOpen && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  {CLASSES.map(c => (
                    <div key={c}>
                      {requiresSerie(c) ? (
                        <>
                          <div className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">{c}</div>
                          {['D', 'A4'].map(s => (
                            <Link key={s} to={`/catalog?classe=${encodeURIComponent(c)}&serie=${s}`}
                              onClick={() => setClassesOpen(false)}
                              className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors">
                              <span className={`h-2 w-2 rounded-full ${s === 'D' ? 'bg-brand' : 'bg-purple-500'}`} />
                              Série {s}
                            </Link>
                          ))}
                        </>
                      ) : (
                        <Link to={`/catalog?classe=${encodeURIComponent(c)}`}
                          onClick={() => setClassesOpen(false)}
                          className="flex items-center gap-2 px-4 py-1.5 text-sm text-gray-700 hover:bg-primary hover:text-white transition-colors">
                          {c}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user && navLink(dashLink, 'Mon espace')}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Search toggle */}
            <button onClick={() => setSearchOpen(v => !v)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-primary transition-colors">
              <Search className="h-4.5 w-4.5" style={{ height: '18px', width: '18px' }} />
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                  <Bell style={{ height: '18px', width: '18px' }} />
                  {unread > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger-light0 text-white text-[9px] flex items-center justify-center font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Link>

                {/* User menu */}
                <div className="relative" ref={userMenuRef}>
                  <button onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-full border border-gray-200 hover:border-brand transition-colors bg-white">
                    <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold overflow-hidden">
                      {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.name[0]?.toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[100px] truncate">{user.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${user.role === 'superadmin' ? 'bg-danger-light text-danger' : user.role === 'admin' ? 'bg-warning-light text-warning' : user.role === 'instructor' ? 'bg-purple-100 text-purple-700' : 'bg-brand/15 text-brand-dark'}`}>
                          {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : user.role === 'instructor' ? 'Formateur' : 'Élève'}
                        </span>
                      </div>
                      <Link to={dashLink} onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <LayoutDashboard className="h-4 w-4 text-gray-400" /> Mon espace
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
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-primary px-3 py-1.5 rounded-lg transition-colors">
                  Connexion
                </Link>
                <Link to="/register"
                  className="text-sm font-bold bg-brand hover:bg-brand-dark text-white px-4 py-1.5 rounded-sm transition-colors">
                  S'inscrire
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button onClick={() => setMenuOpen(v => !v)} className="md:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600">
              {menuOpen ? <X style={{ height: '18px', width: '18px' }} /> : <Menu style={{ height: '18px', width: '18px' }} />}
            </button>
          </div>
        </div>

        {/* Search bar (expanding) */}
        {searchOpen && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
            <form onSubmit={handleSearch} className="flex max-w-2xl mx-auto gap-2">
              <input autoFocus value={searchVal} onChange={e => setSearchVal(e.target.value)}
                placeholder="Rechercher une matière, une leçon…"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white" />
              <button type="submit" className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors">
                Rechercher
              </button>
              <button type="button" onClick={() => setSearchOpen(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            <Link to="/home" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-brand">Accueil</Link>
            <Link to="/catalog" onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-brand">Catalogue</Link>
            {CLASSES.map(c => (
              <div key={c}>
                {requiresSerie(c) ? (
                  <>
                    <p className="text-xs font-bold text-gray-400 pt-2">{c}</p>
                    {['D', 'A4'].map(s => (
                      <Link key={s} to={`/catalog?classe=${encodeURIComponent(c)}&serie=${s}`}
                        onClick={() => setMenuOpen(false)}
                        className="block text-sm text-gray-600 py-1.5 pl-3 hover:text-brand">
                        Série {s}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link to={`/catalog?classe=${encodeURIComponent(c)}`}
                    onClick={() => setMenuOpen(false)}
                    className="block text-sm text-gray-700 py-2 hover:text-brand">
                    {c}
                  </Link>
                )}
              </div>
            ))}
            {user && <Link to={dashLink} onClick={() => setMenuOpen(false)} className="block text-sm text-gray-700 py-2 hover:text-brand">Mon espace</Link>}
          </div>
        )}
      </nav>
    </>
  );
}
