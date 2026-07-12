import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, Users, TrendingUp, PenSquare, Trash2, Eye, Plus, ClipboardList, CheckCircle, BarChart2 } from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import PageWrapper from '../../../components/layout/PageWrapper';
import { CLASSES, SERIES, SERIE_LABELS, SUBJECTS_BY_SERIE, SUBJECTS_COLLEGE, requiresSerie } from '../../../utils/schoolData';

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = { blue: 'bg-brand/10 text-brand-dark', green: 'bg-success-light text-success', purple: 'bg-purple-50 text-purple-600', orange: 'bg-warning-light text-warning' };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}><Icon className="h-6 w-6" /></div>
      <div><div className="text-2xl font-bold text-gray-900">{value}</div><div className="text-sm text-gray-500">{label}</div></div>
    </div>
  );
}

function CreateCourseModal({ open, onClose, autoOpen }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ description: '', subject: '', classe: 'Seconde', serie: 'D' });
  const [lessons, setLessons] = useState([{ title: '' }, { title: '' }, { title: '' }]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const needsSerie = requiresSerie(form.classe);
  const subjects = needsSerie ? (SUBJECTS_BY_SERIE[form.serie] || []) : SUBJECTS_COLLEGE;

  const addLesson = () => setLessons(ls => [...ls, { title: '' }]);
  const removeLesson = (i) => setLessons(ls => ls.filter((_, idx) => idx !== i));
  const setLesson = (i, v) => setLessons(ls => ls.map((l, idx) => idx === i ? { title: v } : l));

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: courseRes } = await api.post('/courses', {
        title: form.subject,   // la matière EST le cours
        description: form.description,
        subject: form.subject,
        classe: form.classe,
        serie: needsSerie ? form.serie : null,
      });
      const courseId = courseRes.data._id;

      for (let i = 0; i < lessons.length; i++) {
        const l = lessons[i];
        if (!l.title.trim()) continue;
        await api.post(`/courses/${courseId}/lessons`, { title: l.title, order: i });
      }
      return courseId;
    },
    onSuccess: (courseId) => {
      toast.success('Cours créé avec ses leçons !');
      qc.invalidateQueries(['dashboard-instructor']);
      onClose();
      navigate(`/instructor/courses/${courseId}/edit`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de la création'),
  });

  const handleClose = () => { setStep(1); setForm({ description: '', subject: '', classe: 'Seconde', serie: 'D' }); setLessons([{ title: '' }, { title: '' }, { title: '' }]); onClose(); };

  return (
    <Modal open={open} onClose={handleClose} title={step === 1 ? '📚 Nouveau cours — Informations' : '📝 Ajouter les leçons'} size="lg">
      {step === 1 ? (
        <div className="space-y-4">
          {/* Classe */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Classe</label>
            <div className="flex gap-2">
              {CLASSES.map(c => (
                <button key={c} type="button" onClick={() => { set('classe', c); if (!requiresSerie(c)) { set('serie', ''); } set('subject', ''); }}
                  className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${form.classe === c ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Série */}
          {needsSerie && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Série</label>
              <div className="flex gap-3">
                {SERIES.map(s => (
                  <button key={s} type="button" onClick={() => { set('serie', s); set('subject', ''); }}
                    className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${form.serie === s
                      ? s === 'D' ? 'border-brand bg-brand text-white' : 'border-purple-600 bg-purple-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    <div className="font-bold">Série {s}</div>
                    <div className="text-xs opacity-80">{s === 'D' ? 'Scientifique' : 'Littéraire'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matière = Cours */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Matière / Cours</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {subjects.map(s => (
                <button key={s} type="button" onClick={() => set('subject', s)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${form.subject === s ? 'border-brand/100 bg-brand/10 text-brand-dark' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {s}
                </button>
              ))}
            </div>
            <Input placeholder="Ou saisir une autre matière…" value={form.subject} onChange={e => set('subject', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">La matière est le nom du cours. Ex : "Mathématiques", "SVT"…</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Description (optionnel)</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Programme, objectifs, prérequis…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/100 resize-none" />
          </div>

          <Button className="w-full" disabled={!form.subject || !form.classe || (needsSerie && !form.serie)}
            onClick={() => setStep(2)}>
            Suivant — Ajouter les leçons →
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Ajoutez les leçons de votre cours. Vous pourrez en ajouter d'autres plus tard.</p>

          <p className="text-xs text-gray-400 -mt-2">Le contenu (vidéo, PDF, texte…) sera ajouté depuis l'éditeur du cours après création.</p>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {lessons.map((lesson, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-6 shrink-0">#{i + 1}</span>
                <Input placeholder={`Titre de la leçon ${i + 1}…`} value={lesson.title} onChange={e => setLesson(i, e.target.value)} className="flex-1" />
                {lessons.length > 1 && (
                  <button onClick={() => removeLesson(i)} className="text-danger hover:text-danger p-1 shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addLesson} className="w-full py-2 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-brand hover:text-brand-dark transition-colors">
            + Ajouter une leçon
          </button>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>← Retour</Button>
            <Button className="flex-1" loading={mutation.isPending} onClick={() => mutation.mutate()}>
              Créer le cours
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CourseRow({ course, onPublish, onDelete, publishPending }) {
  const [showStats, setShowStats] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['course-stats', course._id],
    queryFn: () => api.get(`/dashboard/course/${course._id}/stats`).then(r => r.data.data),
    enabled: showStats,
  });

  const completionRate = stats?.enrollmentCount > 0
    ? Math.round((stats.completedCount / stats.enrollmentCount) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="p-5 flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary to-brand overflow-hidden shrink-0 flex items-center justify-center">
          {course.coverImage
            ? <img src={course.coverImage} alt="" className="w-full h-full object-cover" />
            : <BookOpen className="h-6 w-6 text-white/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-gray-900 truncate">{course.title}</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{course.classe}</span>
            {course.serie && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.serie === 'D' ? 'bg-brand/15 text-brand-dark' : 'bg-purple-100 text-purple-700'}`}>
                Série {course.serie}
              </span>
            )}
            <Badge color={course.status === 'published' ? 'green' : 'gray'}>
              {course.status === 'published' ? 'Publié' : 'Brouillon'}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{course.subject}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{course.enrollmentsCount || 0} inscrit{(course.enrollmentsCount || 0) > 1 ? 's' : ''}</span>
            {stats && (
              <span className="flex items-center gap-1 text-success font-medium">
                <CheckCircle className="h-3 w-3" />{stats.completedCount} complété{stats.completedCount > 1 ? 's' : ''} ({completionRate}%)
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowStats(v => !v)}
            className={`p-2 rounded-lg transition-colors ${showStats ? 'bg-primary text-white' : 'hover:bg-gray-100 text-gray-500'}`}
            title="Statistiques">
            <BarChart2 className="h-4 w-4" />
          </button>
          <Link to={`/instructor/courses/${course._id}/edit`}>
            <Button size="sm" variant="ghost"><PenSquare className="h-4 w-4" /></Button>
          </Link>
          <Link to={`/courses/${course._id}`} target="_blank">
            <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
          </Link>
          <Button size="sm" variant={course.status === 'published' ? 'secondary' : 'outline'}
            loading={publishPending} onClick={onPublish}>
            {course.status === 'published' ? 'Dépublier' : 'Publier'}
          </Button>
          <Button size="sm" variant="ghost" className="text-danger-light0 hover:bg-danger-light" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats panel */}
      {showStats && (
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Inscrits', value: stats?.enrollmentCount ?? '…', color: 'text-primary' },
            { label: 'Complétés', value: stats?.completedCount ?? '…', color: 'text-success' },
            { label: 'Taux de complétion', value: stats ? `${completionRate}%` : '…', color: 'text-purple-600' },
            { label: 'Leçons', value: stats?.lessonsCount ?? '…', color: 'text-gray-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InstructorDashboard() {
  const [params] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(params.get('new') === 'true');
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
          <p className="text-gray-500 mt-1">Gérez vos cours par classe et série</p>
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
        <div className="bg-warning-light border border-warning/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-warning">
            <ClipboardList className="h-5 w-5" />
            <span className="font-medium">{data.pendingGradingCount} copie{data.pendingGradingCount > 1 ? 's' : ''} à corriger</span>
          </div>
          <Link to="/instructor/grading" className="text-sm text-warning hover:underline font-medium">Corriger →</Link>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes cours</h2>
      {data?.courses?.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 mb-1 font-medium">Aucun cours créé</p>
          <p className="text-gray-400 text-sm mb-4">Créez votre premier cours en choisissant une classe et une série</p>
          <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Créer mon premier cours</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {data.courses.map((course) => (
            <CourseRow key={course._id} course={course}
              onPublish={() => publishMutation.mutate(course._id)}
              onDelete={() => window.confirm('Supprimer ce cours ?') && deleteMutation.mutate(course._id)}
              publishPending={publishMutation.isPending} />
          ))}
        </div>
      )}

      <CreateCourseModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </PageWrapper>
  );
}
