import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Award, TrendingUp, Clock } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import Spinner from '../../../components/ui/Spinner';
import Card, { CardBody } from '../../../components/ui/Card';
import ProgressBar from '../../../components/ui/ProgressBar';
import Badge from '../../../components/ui/Badge';
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

export default function StudentDashboard() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-student'],
    queryFn: () => api.get('/dashboard/student').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-1">Suivez votre progression et accédez à vos ressources</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Cours suivis" value={data?.enrollmentsCount || 0} color="blue" />
        <StatCard icon={TrendingUp} label="Cours complétés" value={data?.completedCourses || 0} color="green" />
        <StatCard icon={Award} label="Certificats" value={data?.certificatesCount || 0} color="purple" />
        <StatCard icon={Clock} label="Progression moy." value={`${data?.avgProgress || 0}%`} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mes cours</h2>
          {data?.enrollments?.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
              <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Vous n'êtes inscrit à aucun cours</p>
              <Link to="/catalog" className="text-blue-600 text-sm font-medium hover:underline">Découvrir le catalogue →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data?.enrollments?.map((e) => (
                <div key={e._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="h-14 w-14 rounded-lg bg-blue-100 overflow-hidden shrink-0">
                    {e.course?.coverImage ? <img src={e.course.coverImage} alt="" className="w-full h-full object-cover" /> : <BookOpen className="h-6 w-6 text-blue-400 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/courses/${e.course?._id}/learn`} className="font-medium text-gray-900 hover:text-blue-600 text-sm truncate block">{e.course?.title}</Link>
                    <ProgressBar value={e.progress} showLabel className="mt-1.5" />
                  </div>
                  <Link to={`/courses/${e.course?._id}/learn`} className="text-xs text-blue-600 hover:underline shrink-0">
                    {e.progress > 0 ? 'Continuer' : 'Commencer'}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Derniers examens</h2>
          {data?.recentResults?.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-gray-400 text-sm">Aucun examen passé</div>
          ) : (
            <div className="space-y-3">
              {data?.recentResults?.map((r) => (
                <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-800 truncate">{r.exam?.title}</span>
                    <Badge color={r.passed ? 'green' : r.needsManualGrading ? 'blue' : 'red'}>
                      {r.needsManualGrading ? 'En attente' : r.passed ? 'Réussi' : 'Échoué'}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500">Score : <span className="font-semibold text-gray-900">{r.score}%</span></div>
                </div>
              ))}
            </div>
          )}

          {data?.certificates?.length > 0 && (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-4">Certificats</h2>
              <div className="space-y-3">
                {data.certificates.map((c) => (
                  <div key={c._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
                    <Award className="h-8 w-8 text-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{c.course?.title}</div>
                      <div className="text-xs text-gray-400">{new Date(c.issuedAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <Link to={`/api/certificates/${c._id}/download`} target="_blank" className="text-xs text-blue-600 hover:underline">PDF</Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
