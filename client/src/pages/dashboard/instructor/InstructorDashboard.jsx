import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, Users, TrendingUp, PenSquare, Trash2, Eye, Plus, BarChart, ClipboardList } from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import PageWrapper from '../../../components/layout/PageWrapper';

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-6 w-6" /></div>
      <div><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-sm text-gray-500">{label}</div></div>
    </div>
  );
}

function CreateCourseModal({ open, onClose }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', category: '', level: 'beginner' });

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      return api.post('/courses', fd);
    },
    onSuccess: ({ data }) => {
      toast.success('Cours créé !');
      qc.invalidateQueries(['dashboard-instructor']);
      onClose();
      navigate(`/instructor/courses/${data.data._id}/edit`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nouveau cours">
      <div className="space-y-4">
        <Input label="Titre" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
          <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <Input label="Catégorie" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Niveau</label>
          <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="beginner">Débutant</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="advanced">Avancé</option>
          </select>
        </div>
        <Button className="w-full" loading={mutation.isPending} onClick={() => mutation.mutate()}>Créer le cours</Button>
      </div>
    </Modal>
  );
}

export default function InstructorDashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-instructor'],
    queryFn: () => api.get('/dashboard/instructor').then(r => r.data.data),
  });

  const publishMutation = useMutation({
    mutationFn: (id) => api.patch(`/courses/${id}/publish`),
    onSuccess: () => { toast.success('Statut mis à jour'); qc.invalidateQueries(['dashboard-instructor']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/courses/${id}`),
    onSuccess: () => { toast.success('Cours supprimé'); qc.invalidateQueries(['dashboard-instructor']); },
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Espace Formateur</h1>
          <p className="text-gray-500 mt-1">Gérez vos cours et suivez vos apprenants</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nouveau cours</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Cours" value={data?.coursesCount || 0} color="blue" />
        <StatCard icon={Users} label="Étudiants" value={data?.totalStudents || 0} color="green" />
        <StatCard icon={TrendingUp} label="Taux de réussite" value={`${data?.avgPassRate || 0}%`} color="purple" />
        <StatCard icon={ClipboardList} label="À corriger" value={data?.pendingGradingCount || 0} color="orange" />
      </div>

      {data?.pendingGradingCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-700">
            <ClipboardList className="h-5 w-5" />
            <span className="font-medium">{data.pendingGradingCount} copie{data.pendingGradingCount > 1 ? 's' : ''} à corriger manuellement</span>
          </div>
          <Link to="/instructor/grading" className="text-sm text-orange-700 hover:underline font-medium">Corriger →</Link>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes cours</h2>
      {data?.courses?.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">Vous n'avez pas encore créé de cours</p>
          <Button onClick={() => setCreateOpen(true)}>Créer mon premier cours</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.courses.map((course) => (
            <div key={course._id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 overflow-hidden shrink-0">
                {course.coverImage && <img src={course.coverImage} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 truncate">{course.title}</span>
                  <Badge color={course.status === 'published' ? 'green' : 'gray'}>
                    {course.status === 'published' ? 'Publié' : 'Brouillon'}
                  </Badge>
                </div>
                <div className="text-xs text-gray-400">{course.enrollmentsCount || 0} inscrits · {course.avgProgress || 0}% progression moy.</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/instructor/courses/${course._id}/edit`}>
                  <Button size="sm" variant="ghost"><PenSquare className="h-4 w-4" /></Button>
                </Link>
                <Link to={`/courses/${course._id}`} target="_blank">
                  <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                </Link>
                <Button size="sm" variant={course.status === 'published' ? 'secondary' : 'outline'}
                  loading={publishMutation.isPending} onClick={() => publishMutation.mutate(course._id)}>
                  {course.status === 'published' ? 'Dépublier' : 'Publier'}
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50"
                  onClick={() => window.confirm('Supprimer ce cours ?') && deleteMutation.mutate(course._id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageWrapper>
  );
}
