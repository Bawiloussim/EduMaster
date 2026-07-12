import { Link, NavLink, useNavigate } from 'react-router-dom';
import { GraduationCap, User, LogOut, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Generic left sidebar shared by the admin, instructor and student spaces.
 * Each item is either tab-style ({id, label, icon} + activeId/onSelect from the
 * parent) or route-style ({id, label, icon, to, end?} rendered as a NavLink).
 */
export default function DashboardSidebar({ subtitle, sections, activeId, onSelect, mobileOpen, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const itemClasses = (active) =>
    `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-[#0ea5e9] text-white' : 'text-blue-100 hover:bg-white/10'
    }`;

  const content = (
    <div className="flex flex-col h-full bg-[#04214a] text-blue-100">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-white/10">
        <div className="h-9 w-9 bg-[#0ea5e9] rounded-lg flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight min-w-0">
          <p className="font-bold text-white text-sm truncate">EduMaster</p>
          <p className="text-xs text-blue-300 truncate">{subtitle}</p>
        </div>
        <button onClick={onClose} className="md:hidden ml-auto p-1 text-blue-300 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-400">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) =>
                item.to ? (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end}
                    onClick={onClose}
                    className={({ isActive }) => itemClasses(isActive)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => { onSelect(item.id); onClose?.(); }}
                    className={itemClasses(activeId === item.id)}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 space-y-1 shrink-0">
        <Link to="/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-blue-100 hover:bg-white/10 transition-colors">
          <User className="h-4 w-4 shrink-0" /> Mon profil
        </Link>
        <button
          onClick={async () => { await logout(); navigate('/'); }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="relative w-64 h-full">{content}</aside>
        </div>
      )}
    </>
  );
}
