import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, HelpCircle, BarChart, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import PageWrapper from '../../components/layout/PageWrapper';

export default function ExamStart() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => api.get(`/exams/${examId}`).then(r => r.data.data),
  });

  const startMutation = useMutation({
    mutationFn: () => api.post(`/exams/${examId}/start`),
    onSuccess: ({ data }) => {
      navigate(`/exams/${examId}/session/${data.data._id}`, {
        state: { attempt: data.data, questions: data.questions },
      });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Impossible de démarrer l\'examen'),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!exam) return <div className="text-center py-20">Examen introuvable</div>;

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{exam.title}</h1>
          {exam.description && <p className="text-gray-500 mb-6">{exam.description}</p>}

          <div className="grid grid-cols-2 gap-4 mb-8">
            {[
              { icon: Clock, label: 'Durée', value: `${exam.duration} min` },
              { icon: BarChart, label: 'Score requis', value: `${exam.passingScore}%` },
              { icon: HelpCircle, label: 'Questions', value: exam.questionCount || '?' },
              { icon: AlertTriangle, label: 'Tentatives max', value: exam.maxAttempts },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <div className="h-10 w-10 bg-brand/15 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-brand-dark" />
                </div>
                <div>
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="font-semibold text-gray-900">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Règles à respecter</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Ne quittez pas la fenêtre pendant l'examen</li>
              <li>Les réponses sont sauvegardées automatiquement toutes les 15 secondes</li>
              <li>La soumission est définitive, vous ne pouvez pas revenir en arrière</li>
              <li>Le temps est validé côté serveur</li>
            </ul>
          </div>

          <Button className="w-full" size="lg" loading={startMutation.isPending} onClick={() => startMutation.mutate()}>
            Démarrer l'examen
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
