import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Award, RotateCcw, BookOpen } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import PageWrapper from '../../components/layout/PageWrapper';

export default function ExamResult() {
  const { examId, attemptId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const { data: resultData, isLoading } = useQuery({
    queryKey: ['result', attemptId],
    queryFn: () => api.get(`/attempts/${attemptId}`).then(r => r.data.data),
    initialData: state?.result,
    enabled: !state?.result,
  });

  const result = state?.result || resultData;
  const questions = state?.questions || [];
  const certificate = state?.certificate;

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!result) return <div className="text-center py-20">Résultat introuvable</div>;

  const passed = result.passed;
  const score = result.score;
  const needsManual = result.needsManualGrading;

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        <div className={`rounded-2xl p-8 text-center mb-8 ${passed ? 'bg-success-light border-2 border-success/30' : needsManual ? 'bg-brand/10 border-2 border-brand/25' : 'bg-danger-light border-2 border-danger/30'}`}>
          {needsManual ? (
            <><BookOpen className="h-16 w-16 text-brand-light0 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-primary mb-2">Correction en cours</h1>
              <p className="text-brand-dark">Votre examen contient des questions ouvertes. Votre formateur les corrigera prochainement.</p></>
          ) : passed ? (
            <><CheckCircle className="h-16 w-16 text-success-light0 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-success mb-2">Félicitations !</h1>
              <p className="text-success">Vous avez réussi l'examen avec {score}%.</p></>
          ) : (
            <><XCircle className="h-16 w-16 text-danger-light0 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-red-900 mb-2">Examen non réussi</h1>
              <p className="text-danger">Vous avez obtenu {score}%. Bonne chance pour la prochaine tentative.</p></>
          )}

          <div className="mt-6 inline-flex items-center justify-center h-24 w-24 rounded-full border-4 border-current text-3xl font-bold">
            {score}%
          </div>

          {result.focusLostCount > 0 && (
            <p className="mt-4 text-xs text-gray-500">{result.focusLostCount} changement{result.focusLostCount > 1 ? 's' : ''} de fenêtre détecté{result.focusLostCount > 1 ? 's' : ''}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {certificate && (
            <Button onClick={() => navigate('/student/certificates')}>
              <Award className="h-4 w-4" /> Télécharger mon certificat
            </Button>
          )}
          <Button variant="secondary" onClick={() => navigate(`/exams/${examId}`)}>
            <RotateCcw className="h-4 w-4" /> Revoir l'examen
          </Button>
          <Button variant="ghost" onClick={() => navigate('/student')}>Dashboard</Button>
        </div>

        {questions.length > 0 && !needsManual && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Correction détaillée</h2>
            {questions.map((q, i) => {
              const a = result.answers?.find(ans => ans.questionId === q._id || ans.questionId?.toString() === q._id?.toString());
              const correct = a?.isCorrect;
              return (
                <div key={q._id} className={`bg-white rounded-xl border-2 p-5 ${correct ? 'border-success/30' : correct === false ? 'border-danger/30' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    {correct ? <CheckCircle className="h-5 w-5 text-success-light0 shrink-0 mt-0.5" /> : correct === false ? <XCircle className="h-5 w-5 text-danger-light0 shrink-0 mt-0.5" /> : <div className="h-5 w-5 rounded-full border-2 border-gray-300 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-1">{i + 1}. {q.text}</p>
                      {q.explanation && <p className="text-sm text-gray-500 italic">{q.explanation}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
