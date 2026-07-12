import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, BookOpen, BarChart, Award, GraduationCap, Download, Trash2, Eye, Upload, Layers, Trophy, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import DashboardSidebar from '../../../components/layout/DashboardSidebar';
import DashboardTopbar from '../../../components/layout/DashboardTopbar';
import Footer from '../../../components/layout/Footer';
import { useAuthStore } from '../../../store/useAuthStore';
import PalmaresTab from './tabs/PalmaresTab';
import ClassesTab from './tabs/ClassesTab';
import AnnouncementsTab from './tabs/AnnouncementsTab';
import ImportStudentsModal from './tabs/ImportStudentsModal';
import ImportInstructorsModal from './tabs/ImportInstructorsModal';
import ImportCoursesModal from './tabs/ImportCoursesModal';

const TAB_TITLES = {
  overview: "Vue d'ensemble",
  instructors: 'Formateurs',
  students: 'Élèves',
  courses: 'Cours',
  classes: 'Classes',
  palmares: 'Palmarès',
  announcements: 'Annonces',
};

const SIDEBAR_SECTIONS = [
  {
    label: 'Général',
    items: [{ id: 'overview', label: "Vue d'ensemble", icon: BarChart }],
  },
  {
    label: 'Gestion',
    items: [
      { id: 'instructors', label: 'Formateurs', icon: GraduationCap },
      { id: 'students', label: 'Élèves', icon: Users },
      { id: 'courses', label: 'Cours', icon: BookOpen },
      { id: 'classes', label: 'Classes', icon: Layers },
    ],
  },
  {
    label: 'Pédagogie',
    items: [
      { id: 'palmares', label: 'Palmarès', icon: Trophy },
      { id: 'announcements', label: 'Annonces', icon: Megaphone },
    ],
  },
];

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = { blue: 'bg-brand/10 text-brand-dark', green: 'bg-success-light text-success', purple: 'bg-purple-50 text-purple-600', orange: 'bg-warning-light text-warning' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-6 w-6" /></div>
      <div><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-sm text-gray-500">{label}</div></div>
    </div>
  );
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then(r => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => { toast.success('Rôle mis à jour'); qc.invalidateQueries(['admin-users']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Utilisateurs" value={data?.usersCount || 0} color="blue" />
        <StatCard icon={BookOpen} label="Cours" value={data?.coursesCount || 0} color="green" />
        <StatCard icon={BarChart} label="Inscriptions" value={data?.enrollmentsCount || 0} color="purple" />
        <StatCard icon={Award} label="Examens corrigés" value={data?.resultsCount || 0} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cours populaires</h2>
          <div className="space-y-3">
            {data?.popularCourses?.map((c) => (
              <div key={c._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-brand/15 overflow-hidden shrink-0">
                  {c.coverImage && <img src={c.coverImage} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{c.title}</div>
                  <div className="text-xs text-gray-400">{c.instructor?.name} · {c.enrollmentCount} inscrits</div>
                </div>
                <Badge color={c.status === 'published' ? 'green' : 'gray'}>
                  {c.status === 'published' ? 'Publié' : 'Brouillon'}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestion des utilisateurs</h2>
          {usersLoading ? <Spinner /> : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {usersData?.data?.map((u) => (
                <div key={u._id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                    {u.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{u.name}</div>
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                  </div>
                  {u.role === 'superadmin' ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-danger-light text-danger">Super Admin</span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={!isSuperAdmin && u.role === 'admin'}
                      onChange={(e) => roleMutation.mutate({ id: u._id, role: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="student">Étudiant</option>
                      <option value="instructor">Formateur</option>
                      <option value="admin" disabled={!isSuperAdmin}>Admin</option>
                      {isSuperAdmin && <option value="superadmin">Super Admin</option>}
                    </select>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Instructors tab ──────────────────────────────────────────────────────────
function InstructorsTab() {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/instructors').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Importer CSV
        </Button>
      </div>
      <ImportInstructorsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries(['admin-instructors'])}
      />
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
            <th className="px-4 py-3 text-left font-semibold">Formateur</th>
            <th className="px-4 py-3 text-center font-semibold">Cours</th>
            <th className="px-4 py-3 text-center font-semibold">Élèves</th>
            <th className="px-4 py-3 text-center font-semibold">Taux de réussite</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data?.map((i) => (
            <tr key={i._id}>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{i.name}</div>
                <div className="text-xs text-gray-400">{i.email}</div>
              </td>
              <td className="px-4 py-3 text-center">{i.coursesCount}</td>
              <td className="px-4 py-3 text-center">{i.studentsCount}</td>
              <td className="px-4 py-3 text-center">{i.avgPassRate}%</td>
            </tr>
          ))}
          {data?.length === 0 && (
            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Aucun formateur</td></tr>
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}

// ─── Students tab ──────────────────────────────────────────────────────────────
async function downloadStudentBulletin(studentId, studentName) {
  try {
    const res = await api.get(`/evaluations/bulletin/1/pdf/student/${studentId}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulletin-${studentName || studentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error('Bulletin non disponible');
  }
}

function StudentsTab() {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => api.get('/admin/students').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Importer CSV
        </Button>
      </div>
      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries(['admin-students'])}
      />
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
            <th className="px-4 py-3 text-left font-semibold">Élève</th>
            <th className="px-4 py-3 text-center font-semibold">Niveau</th>
            <th className="px-4 py-3 text-center font-semibold">Cours</th>
            <th className="px-4 py-3 text-center font-semibold">Progression</th>
            <th className="px-4 py-3 text-center font-semibold">Bulletin</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data?.map((s) => (
            <tr key={s._id}>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900">{s.name}</div>
                <div className="text-xs text-gray-400">{s.email}</div>
              </td>
              <td className="px-4 py-3 text-center">
                {s.classe ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.classe}{s.serie ? ` · ${s.serie}` : ''}</span> : <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-3 text-center">{s.coursesCount}</td>
              <td className="px-4 py-3 text-center">{s.avgProgress}%</td>
              <td className="px-4 py-3 text-center">
                <button onClick={() => downloadStudentBulletin(s._id, s.name)} className="text-brand-dark hover:underline text-xs flex items-center gap-1 justify-center w-full">
                  <Download className="h-3 w-3" /> PDF
                </button>
              </td>
            </tr>
          ))}
          {data?.length === 0 && (
            <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun élève</td></tr>
          )}
        </tbody>
      </table>
    </div>
    </>
  );
}

// ─── Courses tab ────────────────────────────────────────────────────────────────
function CoursesTab() {
  const qc = useQueryClient();
  const [subjectFilter, setSubjectFilter] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => api.get('/courses/admin/all').then(r => r.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => api.patch(`/courses/${id}/publish`),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['admin-courses']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/courses/${id}`),
    onSuccess: () => { toast.success('Cours supprimé'); qc.invalidateQueries(['admin-courses']); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const subjects = [...new Set((data?.data || []).map((c) => c.subject).filter(Boolean))];
  const rows = subjectFilter ? (data?.data || []).filter((c) => c.subject === subjectFilter) : (data?.data || []);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="h-4 w-4" /> Importer CSV
        </Button>
      </div>
      <ImportCoursesModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => qc.invalidateQueries(['admin-courses'])}
      />
      {subjects.length > 0 && (
        <div className="mb-4">
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-3 text-left font-semibold">Cours</th>
              <th className="px-4 py-3 text-left font-semibold">Matière</th>
              <th className="px-4 py-3 text-left font-semibold">Formateur</th>
              <th className="px-4 py-3 text-center font-semibold">Niveau</th>
              <th className="px-4 py-3 text-center font-semibold">Statut</th>
              <th className="px-4 py-3 text-center font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((c) => (
              <tr key={c._id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                <td className="px-4 py-3 text-gray-500">{c.subject || '—'}</td>
                <td className="px-4 py-3 text-gray-500">{c.instructor?.name || '—'}</td>
                <td className="px-4 py-3 text-center text-xs text-gray-500">{c.classe}{c.serie ? ` · Série ${c.serie}` : ''}</td>
                <td className="px-4 py-3 text-center">
                  <Badge color={c.status === 'published' ? 'green' : 'gray'}>
                    {c.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <Link to={`/courses/${c._id}`} target="_blank"><Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button></Link>
                    <Button size="sm" variant={c.status === 'published' ? 'secondary' : 'outline'}
                      loading={publishMutation.isPending} onClick={() => publishMutation.mutate(c._id)}>
                      {c.status === 'published' ? 'Dépublier' : 'Publier'}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-light"
                      onClick={() => window.confirm('Supprimer ce cours ?') && deleteMutation.mutate(c._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun cours</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-100 via-gray-50 to-brand/5">
      <DashboardSidebar subtitle={user?.school?.name || "Chef d'établissement"} sections={SIDEBAR_SECTIONS} activeId={activeTab} onSelect={setActiveTab} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopbar title={TAB_TITLES[activeTab]} onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'instructors' && <InstructorsTab />}
          {activeTab === 'students' && <StudentsTab />}
          {activeTab === 'courses' && <CoursesTab />}
          {activeTab === 'classes' && <ClassesTab />}
          {activeTab === 'palmares' && <PalmaresTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
        </main>
        <Footer />
      </div>
    </div>
  );
}
