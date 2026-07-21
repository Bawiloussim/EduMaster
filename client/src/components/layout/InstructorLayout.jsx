import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { BarChart, ClipboardCheck, Library } from 'lucide-react';
import DashboardSidebar from './DashboardSidebar';
import DashboardTopbar from './DashboardTopbar';
import Footer from './Footer';

const SIDEBAR_SECTIONS = [
  {
    label: 'Mon espace',
    items: [
      { id: 'overview', label: "Vue d'ensemble", icon: BarChart, to: '/instructor', end: true },
      { id: 'grading', label: 'Corrections', icon: ClipboardCheck, to: '/instructor/grading' },
      { id: 'browse', label: 'Cours des collègues', icon: Library, to: '/instructor/browse' },
    ],
  },
];

function titleFor(pathname) {
  if (pathname.startsWith('/instructor/grading')) return 'Corrections';
  if (pathname.startsWith('/instructor/courses/')) return 'Édition du cours';
  if (pathname.startsWith('/instructor/browse')) return 'Cours des collègues';
  return "Vue d'ensemble";
}

export default function InstructorLayout({ children }) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-100 via-gray-50 to-brand/5">
      <DashboardSidebar subtitle="Espace Formateur" sections={SIDEBAR_SECTIONS} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopbar title={titleFor(location.pathname)} onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
          <div className="flex-1">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  );
}
