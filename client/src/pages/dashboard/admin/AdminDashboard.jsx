import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users, BookOpen, BarChart, Award } from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Badge from '../../../components/ui/Badge';
import PageWrapper from '../../../components/layout/PageWrapper';
import { useAuthStore } from '../../../store/useAuthStore';

const ROLE_COLORS = { superadmin: 'red', admin: 'yellow', instructor: 'purple', student: 'blue' };
const ROLE_LABELS = { superadmin: 'Super Admin', admin: 'Admin', instructor: 'Formateur', student: 'Étudiant' };

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-6 w-6" /></div>
      <div><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-sm text-gray-500">{label}</div></div>
    </div>
  );
}

export default function AdminDashboard() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-admin'],
    queryFn: () => api.get('/dashboard/admin').then(r => r.data.data),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/notifications/admin/users').then(r => r.data),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => api.patch(`/notifications/admin/users/${id}/role`, { role }),
    onSuccess: () => { toast.success('Rôle mis à jour'); qc.invalidateQueries(['admin-users']); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble de la plateforme EduMaster</p>
      </div>

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
                <div className="h-10 w-10 rounded-lg bg-blue-100 overflow-hidden shrink-0">
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
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">Super Admin</span>
                  ) : (
                    <select
                      value={u.role}
                      disabled={!isSuperAdmin && u.role === 'admin'}
                      onChange={(e) => roleMutation.mutate({ id: u._id, role: e.target.value })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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
    </PageWrapper>
  );
}
