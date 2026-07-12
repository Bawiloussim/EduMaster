import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BookOpen, Clock, Users, Award, ChevronDown, ChevronRight, Play, FileText, Lock } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import PageWrapper from '../../components/layout/PageWrapper';

const TYPE_ICONS = { video: Play, pdf: FileText, text: BookOpen, exercise: BookOpen };

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => api.get(`/courses/${id}`).then(r => r.data.data),
  });

  const enrollMutation = useMutation({
    mutationFn: () => api.post('/enrollments', { courseId: id }),
    onSuccess: () => {
      toast.success('Inscription réussie ! Bonne formation.');
      qc.invalidateQueries(['course', id]);
      navigate(`/courses/${id}/learn`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de l\'inscription'),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!data) return <div className="text-center py-20">Cours introuvable</div>;

  const { lessons = [], isEnrolled, enrollment } = data;
  const grouped = data.modules?.reduce((acc, mod) => {
    acc[mod._id] = { ...mod, lessons: lessons.filter(l => l.moduleId === mod._id || l.moduleId?.toString() === mod._id?.toString()) };
    return acc;
  }, {}) || {};
  const ungrouped = lessons.filter(l => !data.modules?.find(m => m._id?.toString() === l.moduleId?.toString()));

  const handleEnroll = () => {
    if (!user) return navigate('/login');
    if (user.role !== 'student') return toast.error('Seuls les étudiants peuvent s\'inscrire');
    enrollMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary to-primary-dark text-white py-12">
        <PageWrapper>
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <Link to="/catalog" className="text-brand-light hover:text-white text-sm">Catalogue</Link>
              <ChevronRight className="h-4 w-4 text-brand-light" />
              <span className="text-sm text-brand-light">{data.classe}</span>
              <ChevronRight className="h-4 w-4 text-brand-light" />
              <span className="text-sm text-brand-light">{data.subject}</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
            <p className="text-brand-light mb-6 max-w-2xl">{data.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-brand-light">
              <span className="flex items-center gap-1"><Users className="h-4 w-4" />{data.enrollmentCount || 0} inscrits</span>
              <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{lessons.length} leçons</span>
              {data.estimatedDuration > 0 && <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{data.estimatedDuration}h estimées</span>}
              <span className="bg-white/20 rounded-full px-3 py-0.5 text-xs font-semibold">{data.classe}</span>
              {data.serie && (
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${data.serie === 'D' ? 'bg-brand/100' : 'bg-purple-500'}`}>Série {data.serie}</span>
              )}
            </div>
          </div>
        </PageWrapper>
      </div>

      <PageWrapper>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 -mt-6">
          <div className="lg:col-span-2">
            {data.modules?.length > 0 ? (
              <div className="space-y-4">
                {data.modules.sort((a, b) => a.order - b.order).map((mod) => {
                  const modLessons = grouped[mod._id]?.lessons || [];
                  return (
                    <div key={mod._id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">{mod.title}</h3>
                        <span className="text-xs text-gray-500">{modLessons.length} leçon{modLessons.length > 1 ? 's' : ''}</span>
                      </div>
                      <ul className="divide-y divide-gray-50">
                        {modLessons.sort((a, b) => a.order - b.order).map((lesson) => {
                          const Icon = TYPE_ICONS[lesson.type] || BookOpen;
                          const accessible = isEnrolled || lesson.isFreePreview;
                          return (
                            <li key={lesson._id} className={`flex items-center gap-3 px-5 py-3 ${accessible && isEnrolled ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                              onClick={() => accessible && isEnrolled && navigate(`/courses/${id}/learn?lesson=${lesson._id}`)}>
                              <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                              <span className={`text-sm flex-1 ${!accessible ? 'text-gray-400' : 'text-gray-700'}`}>{lesson.title}</span>
                              {lesson.isFreePreview && !isEnrolled && <Badge color="green">Aperçu</Badge>}
                              {!accessible && <Lock className="h-4 w-4 text-gray-300" />}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
                {ungrouped.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-100">
                    <ul className="divide-y divide-gray-50">
                      {ungrouped.map((lesson) => (
                        <li key={lesson._id} className="flex items-center gap-3 px-5 py-3">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-700">{lesson.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : lessons.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-100">
                <ul className="divide-y divide-gray-50">
                  {lessons.map((l) => <li key={l._id} className="flex items-center gap-3 px-5 py-3 text-sm text-gray-700"><BookOpen className="h-4 w-4 text-gray-400" />{l.title}</li>)}
                </ul>
              </div>
            ) : <p className="text-gray-400 py-8 text-center">Aucune leçon disponible pour l'instant.</p>}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
              {data.coverImage && <img src={data.coverImage} alt="" className="w-full h-40 object-cover rounded-xl mb-5" />}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-extrabold text-success">100% Gratuit</span>
                <span className="text-xs bg-success-light text-success font-bold px-2 py-0.5 rounded-full">Toujours gratuit</span>
              </div>
              {isEnrolled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-success text-sm font-medium">
                    <Award className="h-4 w-4" /> Inscrit · {enrollment?.progress || 0}% complété
                  </div>
                  <Button className="w-full" onClick={() => navigate(`/courses/${id}/learn`)}>
                    {enrollment?.progress > 0 ? 'Continuer' : 'Commencer'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full" size="lg" loading={enrollMutation.isPending} onClick={handleEnroll}>
                    {user ? 'S\'inscrire gratuitement' : 'Se connecter pour accéder'}
                  </Button>
                  {!user && (
                    <p className="text-xs text-center text-gray-400">
                      Une inscription gratuite est requise pour accéder aux leçons, bulletins et attestations.
                    </p>
                  )}
                </div>
              )}
              <div className="mt-5 space-y-2 text-sm text-gray-500">
                <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" />{lessons.length} leçon{lessons.length > 1 ? 's' : ''}</div>
                <div className="flex items-center gap-2"><Award className="h-4 w-4" />Attestation gratuite incluse</div>
                <div className="flex items-center gap-2"><span className="h-4 w-4 text-center text-xs font-bold">📋</span>Bulletins trimestriels gratuits</div>
                <div className="flex items-center gap-2"><Users className="h-4 w-4" />Formateur : {data.instructor?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </PageWrapper>
    </div>
  );
}
