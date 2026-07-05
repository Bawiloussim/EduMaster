import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';

function Timer({ startedAt, duration, onExpired }) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000;
      const rem = Math.max(0, duration * 60 - elapsed);
      setRemaining(rem);
      if (rem <= 0) onExpired();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, duration]);

  if (remaining === null) return null;
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const danger = remaining < 120;

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold text-lg ${danger ? 'text-red-600 animate-pulse' : 'text-gray-700'}`}>
      <Clock className="h-5 w-5" />
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </div>
  );
}

function QuestionView({ question, index, answer, onChange }) {
  if (!question) return null;

  if (question.type === 'qcm' || question.type === 'truefalse') {
    const options = question.type === 'truefalse' ? ['Vrai', 'Faux'] : question.options;
    return (
      <div className="space-y-3">
        {options.map((opt, i) => (
          <label key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${answer === i ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name={`q-${question._id}`} value={i} checked={answer === i} onChange={() => onChange(i)} className="accent-blue-600" />
            <span className="text-gray-800">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.type === 'multiple') {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <div className="space-y-3">
        {question.options.map((opt, i) => (
          <label key={i} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selected.includes(i) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="checkbox" checked={selected.includes(i)}
              onChange={() => onChange(selected.includes(i) ? selected.filter(x => x !== i) : [...selected, i])}
              className="accent-blue-600" />
            <span className="text-gray-800">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <textarea
      value={answer || ''}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      placeholder="Rédigez votre réponse ici…"
      className="w-full border-2 border-gray-200 rounded-xl p-4 text-gray-800 focus:outline-none focus:border-blue-500 resize-none"
    />
  );
}

export default function ExamSession() {
  const { examId, attemptId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [questions] = useState(state?.questions || []);
  const [attempt] = useState(state?.attempt || {});
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [focusWarnings, setFocusWarnings] = useState(0);
  const autoSaveRef = useRef(null);

  const getAnswersArray = useCallback(() =>
    questions.map(q => ({ questionId: q._id, answer: answers[q._id] ?? null })),
    [questions, answers]
  );

  const autoSave = useCallback(async () => {
    try {
      await api.patch(`/attempts/${attemptId}/save`, { answers: getAnswersArray() });
    } catch {}
  }, [attemptId, getAnswersArray]);

  useEffect(() => {
    autoSaveRef.current = setInterval(autoSave, 15000);
    return () => clearInterval(autoSaveRef.current);
  }, [autoSave]);

  useEffect(() => {
    const handleVisibility = async () => {
      if (document.hidden) {
        try {
          const { data } = await api.patch(`/attempts/${attemptId}/focus-lost`);
          const count = data.focusLostCount;
          setFocusWarnings(count);
          toast.warning(`Avertissement ${count} : vous avez quitté la fenêtre de l'examen.`);
        } catch {}
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [attemptId]);

  if (!questions.length) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <p>Session introuvable. <button className="text-blue-600" onClick={() => navigate(-1)}>Retour</button></p>
      </div>
    );
  }

  const q = questions[current];
  const answered = Object.keys(answers).filter(k => answers[k] !== null && answers[k] !== undefined && answers[k] !== '').length;

  const setAnswer = (val) => setAnswers(prev => ({ ...prev, [q._id]: val }));

  const handleSubmit = async () => {
    const unanswered = questions.length - answered;
    if (unanswered > 0) {
      if (!window.confirm(`${unanswered} question(s) sans réponse. Confirmer la soumission ?`)) return;
    } else {
      if (!window.confirm('Soumettre l\'examen ? Cette action est irréversible.')) return;
    }
    setSubmitting(true);
    clearInterval(autoSaveRef.current);
    try {
      const { data } = await api.post(`/attempts/${attemptId}/submit`, { answers: getAnswersArray() });
      navigate(`/exams/${examId}/result/${attemptId}`, { state: { result: data.data.result, questions: data.data.questions, certificate: data.data.certificate } });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la soumission');
      setSubmitting(false);
    }
  };

  const handleExpired = () => {
    toast.error('Temps écoulé ! Soumission automatique…');
    handleSubmit();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="text-sm text-gray-600">
          Question <span className="font-semibold text-gray-900">{current + 1}</span> / {questions.length}
          {focusWarnings > 0 && (
            <span className="ml-3 text-red-600 text-xs flex items-center gap-1 inline-flex">
              <AlertTriangle className="h-3 w-3" /> {focusWarnings} avertissement{focusWarnings > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <Timer startedAt={attempt.startedAt} duration={attempt.exam?.duration || 60} onExpired={handleExpired} />
        <div className="text-sm text-gray-500">{answered}/{questions.length} répondues</div>
      </div>

      <div className="flex flex-1">
        {/* Question navigator */}
        <aside className="hidden md:block w-48 bg-white border-r p-4">
          <div className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">Navigation</div>
          <div className="grid grid-cols-5 gap-1.5">
            {questions.map((question, i) => {
              const isAnswered = answers[question._id] !== null && answers[question._id] !== undefined && answers[question._id] !== '';
              return (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`h-8 w-8 rounded text-xs font-medium transition-colors ${i === current ? 'bg-blue-600 text-white' : isAnswered ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 text-xs text-gray-400">
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-green-100 inline-block" /> Répondue</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-gray-100 inline-block" /> Sans réponse</div>
            <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-blue-600 inline-block" /> Actuelle</div>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 max-w-3xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Question {current + 1}</span>
                <p className="text-lg font-semibold text-gray-900 mt-1">{q.text}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0 ml-4">{q.points} pt{q.points > 1 ? 's' : ''}</span>
            </div>
            <QuestionView question={q} index={current} answer={answers[q._id]} onChange={setAnswer} />
          </div>

          <div className="flex items-center justify-between">
            <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>
              <ChevronLeft className="h-4 w-4" /> Précédent
            </Button>
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent(c => c + 1)}>
                Suivant <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="primary" loading={submitting} onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                <Send className="h-4 w-4" /> Soumettre
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
