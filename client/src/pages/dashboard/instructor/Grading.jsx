import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardList, ChevronLeft, Check } from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import PageWrapper from '../../../components/layout/PageWrapper';

function ResultGrading({ result, onDone }) {
  const qc = useQueryClient();
  const openQuestions = result.questions.filter((q) => q.type === 'open');
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const q of openQuestions) {
        const score = Number(scores[q._id] ?? 0);
        await api.patch(`/attempts/${result._id}/grade`, {
          questionId: q._id,
          score,
          comment: comments[q._id] || '',
        });
      }
    },
    onSuccess: () => {
      toast.success('Copie corrigée');
      qc.invalidateQueries(['grading-mine']);
      onDone();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{result.exam.title}</h2>
          <p className="text-xs text-gray-400">{result.student.name} — {result.exam.course.title}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={onDone}><ChevronLeft className="h-4 w-4" /> Retour</Button>
      </div>

      {openQuestions.map((q, i) => {
        const answer = result.answers.find((a) => a.questionId === q._id || a.questionId?._id === q._id);
        return (
          <div key={q._id} className="border border-gray-100 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">Q{i + 1}. {q.text}</p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {answer?.answer || <span className="text-gray-400 italic">Pas de réponse</span>}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600">Note</label>
              <input type="number" min={0} max={q.points} step="0.5"
                value={scores[q._id] ?? ''}
                onChange={(e) => setScores((s) => ({ ...s, [q._id]: e.target.value }))}
                className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-xs text-gray-400">/ {q.points}</span>
            </div>
            <textarea rows={2} placeholder="Commentaire (optionnel)…" value={comments[q._id] || ''}
              onChange={(e) => setComments((c) => ({ ...c, [q._id]: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        );
      })}

      <Button className="w-full" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
        <Check className="h-4 w-4" /> Valider la correction
      </Button>
    </div>
  );
}

export default function Grading() {
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['grading-mine'],
    queryFn: () => api.get('/attempts/grading/mine').then((r) => r.data.data),
  });

  const selected = data?.find((r) => r._id === selectedId);

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <PageWrapper>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Copies à corriger</h1>
      <p className="text-gray-500 text-sm mb-6">Questions ouvertes en attente d'une note</p>

      {selected ? (
        <ResultGrading result={selected} onDone={() => setSelectedId(null)} />
      ) : !data?.length ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <ClipboardList className="h-10 w-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400">Aucune copie en attente de correction</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <button key={r._id} onClick={() => setSelectedId(r._id)}
              className="w-full flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/30 transition-colors text-left">
              <div>
                <p className="font-medium text-gray-900 text-sm">{r.exam.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.student.name} — {r.exam.course.title}</p>
              </div>
              <span className="text-xs text-orange-600 bg-orange-50 border border-orange-100 px-2 py-1 rounded-full font-medium">À corriger</span>
            </button>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
