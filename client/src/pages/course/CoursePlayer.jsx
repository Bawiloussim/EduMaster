import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  CheckCircle, Circle, BookOpen, Play, FileText,
  ChevronRight, ChevronLeft, Award, ExternalLink,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function parseVideoUrl(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/\s]+)/);
  if (yt) return { platform: 'youtube', embedSrc: `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`, original: url };
  const vi = url.match(/vimeo\.com\/(\d+)/);
  if (vi) return { platform: 'vimeo', embedSrc: `https://player.vimeo.com/video/${vi[1]}`, original: url };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) return { platform: 'direct', embedSrc: url, original: url };
  return { platform: 'link', embedSrc: null, original: url };
}

function getPdfUrl(url) {
  if (!url) return null;
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
}

// ─── Exercises for students ───────────────────────────────────────────────────
function ExercisesSection({ lessonId }) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [submitted, setSubmitted] = useState({});

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['exercises-student', lessonId],
    queryFn: () => api.get(`/exercises/lessons/${lessonId}`).then(r => r.data.data),
  });

  const { data: myAnswers } = useQuery({
    queryKey: ['my-answers', lessonId],
    queryFn: () => api.get(`/exercises/lessons/${lessonId}/my-answers`).then(r => r.data.data).catch(() => []),
  });

  useEffect(() => {
    if (myAnswers?.length) {
      const map = {};
      myAnswers.forEach(a => { map[a.exercise] = a.answer; });
      setAnswers(map);
      const sub = {};
      myAnswers.forEach(a => { sub[a.exercise] = a; });
      setSubmitted(sub);
    }
  }, [myAnswers]);

  const submitMutation = useMutation({
    mutationFn: ({ exerciseId, answer, file }) => {
      if (file) {
        const fd = new FormData();
        fd.append('answer', answer || '');
        fd.append('answerFile', file);
        return api.post(`/exercises/${exerciseId}/answer`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return api.post(`/exercises/${exerciseId}/answer`, { answer });
    },
    onSuccess: (res, vars) => {
      const data = res.data;
      setSubmitted(s => ({ ...s, [vars.exerciseId]: data.data }));
      setFiles(f => ({ ...f, [vars.exerciseId]: null }));
      if (data.isCorrect === true) toast.success('Bonne réponse !');
      else if (data.isCorrect === false) toast.error('Mauvaise réponse, essayez encore.');
      else toast.success('Réponse envoyée au professeur.');
      qc.invalidateQueries(['my-answers', lessonId]);
    },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  if (isLoading || !exercises?.length) return null;

  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-blue-500" />
        Exercices ({exercises.length})
      </h3>
      <div className="space-y-5">
        {exercises.map((ex, i) => {
          const sub = submitted[ex._id];
          const myAnswer = answers[ex._id] ?? '';

          return (
            <div key={ex._id} className="bg-gray-50 rounded-xl border border-gray-100 p-5">
              <p className="text-sm font-semibold text-gray-800 mb-3">
                <span className="text-blue-500 mr-2">Exercice {i + 1}.</span>
                {ex.statement}
              </p>

              {ex.type === 'qcm' ? (
                <div className="space-y-2">
                  {ex.options.map((opt, oi) => {
                    const isSelected = myAnswer === String(oi);
                    const isCorrect = sub?.isCorrect && isSelected;
                    const isWrong = sub?.isCorrect === false && isSelected;
                    return (
                      <label key={oi}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors
                          ${isCorrect ? 'bg-green-50 border-green-300' : isWrong ? 'bg-red-50 border-red-300' : isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name={`q-${ex._id}`} value={String(oi)}
                          checked={isSelected}
                          onChange={() => !sub && setAnswers(a => ({ ...a, [ex._id]: String(oi) }))}
                          disabled={!!sub}
                          className="accent-blue-600" />
                        <span className="text-sm text-gray-700">{opt}</span>
                        {isCorrect && <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />}
                        {isWrong && <span className="text-red-500 ml-auto text-xs">✗</span>}
                      </label>
                    );
                  })}
                  {!sub && (
                    <Button size="sm" className="mt-2"
                      disabled={myAnswer === ''}
                      loading={submitMutation.isPending}
                      onClick={() => submitMutation.mutate({ exerciseId: ex._id, answer: myAnswer })}>
                      Valider
                    </Button>
                  )}
                  {sub?.isCorrect === true && <p className="text-green-600 text-xs mt-1">✓ Bonne réponse</p>}
                  {sub?.isCorrect === false && <p className="text-red-500 text-xs mt-1">✗ Mauvaise réponse</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea rows={4}
                    value={myAnswer}
                    onChange={e => !sub && setAnswers(a => ({ ...a, [ex._id]: e.target.value }))}
                    disabled={!!sub}
                    placeholder="Rédigez votre réponse ici…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-50 disabled:text-gray-500" />
                  {!sub && (
                    <label className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 cursor-pointer w-fit">
                      <FileText className="h-3.5 w-3.5" />
                      {files[ex._id] ? files[ex._id].name : 'Ou joindre une photo / un PDF de votre copie'}
                      <input type="file" accept="image/*,.pdf,application/pdf" className="hidden"
                        onChange={e => { const f = e.target.files[0] || null; setFiles(fl => ({ ...fl, [ex._id]: f })); e.target.value = ''; }} />
                    </label>
                  )}
                  {!sub ? (
                    <Button size="sm"
                      disabled={!myAnswer.trim() && !files[ex._id]}
                      loading={submitMutation.isPending}
                      onClick={() => submitMutation.mutate({ exerciseId: ex._id, answer: myAnswer, file: files[ex._id] })}>
                      Envoyer au professeur
                    </Button>
                  ) : sub.grade !== null && sub.grade !== undefined ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`font-bold ${sub.grade >= 5 ? 'text-green-600' : 'text-red-500'}`}>Note : {sub.grade}/10</span>
                      {sub.feedback && <span className="text-gray-500">— {sub.feedback}</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-orange-600">✓ Réponse envoyée — en attente de correction</p>
                  )}
                  {sub?.answerFileUrl && (
                    <a href={getPdfUrl(sub.answerFileUrl)} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline w-fit">
                      <FileText className="h-3.5 w-3.5" /> {sub.answerFileName || 'Voir le fichier envoyé'}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  direct: 'Vidéo',
  link: 'Vidéo externe',
};

// ─── Lesson content viewer ────────────────────────────────────────────────────
function LessonContent({ lesson }) {
  const video = parseVideoUrl(lesson.videoUrl);
  const pdfs = (lesson.pdfUrls || []).map(p => ({ ...p, href: getPdfUrl(p.url) })).filter(p => p.href);
  const hasContent = video || pdfs.length > 0;

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-300">
        <BookOpen className="h-16 w-16 mb-4 opacity-40" />
        <p className="text-sm">Le professeur n'a pas encore ajouté de contenu pour cette leçon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Vidéo */}
      {video && (
        <div>
          {/* Header : label + bouton ouvrir sur la plateforme source */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> {PLATFORM_LABELS[video.platform]}
            </h3>
            <a href={video.original} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
              Ouvrir sur {PLATFORM_LABELS[video.platform]}
            </a>
          </div>

          {/* Lecteur intégré */}
          {(video.platform === 'youtube' || video.platform === 'vimeo') && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
              <iframe
                key={video.embedSrc}
                src={video.embedSrc}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                title={lesson.title}
              />
            </div>
          )}

          {video.platform === 'direct' && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
              <video controls className="w-full h-full" src={video.embedSrc} key={lesson._id} />
            </div>
          )}

          {video.platform === 'link' && (
            <a href={video.original} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 hover:bg-blue-100 transition-colors">
              <Play className="h-5 w-5" />
              <span className="font-medium">Regarder la vidéo</span>
              <ExternalLink className="h-4 w-4 ml-auto" />
            </a>
          )}
        </div>
      )}

      {/* PDF(s) */}
      {pdfs.map((pdf, i) => (
        <div key={pdf.href}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> {pdf.name || (pdfs.length > 1 ? `Document PDF ${i + 1}` : 'Document PDF')}
            </h3>
            <a href={pdf.href} target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              Ouvrir dans un nouvel onglet <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {/* <object> est plus fiable qu'<iframe> pour les PDFs cross-origin */}
          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-gray-100" style={{ height: '80vh' }}>
            <object
              data={pdf.href}
              type="application/pdf"
              className="w-full h-full"
              title={pdf.name || `PDF — ${lesson.title}`}
            >
              {/* Fallback si le navigateur ne peut pas afficher le PDF intégré */}
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                <FileText className="h-16 w-16 opacity-30" />
                <p className="text-sm">Votre navigateur ne peut pas afficher le PDF directement.</p>
                <a href={pdf.href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                  <ExternalLink className="h-4 w-4" /> Télécharger / Ouvrir le PDF
                </a>
              </div>
            </object>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main player ──────────────────────────────────────────────────────────────
export default function CoursePlayer() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { data: courseData, isLoading } = useQuery({
    queryKey: ['course-player', id],
    queryFn: () => api.get(`/courses/${id}`).then(r => r.data.data),
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', id],
    queryFn: () => api.get(`/enrollments/course/${id}`).then(r => r.data.data).catch(() => null),
  });

  const lessons = courseData?.lessons || [];
  const currentLessonId = params.get('lesson') || lessons[0]?._id;
  const currentLesson = lessons.find(l => l._id === currentLessonId) || lessons[0];
  const currentIndex = lessons.findIndex(l => l._id === currentLesson?._id);

  useEffect(() => {
    if (enrollment?.lastLessonId && !params.get('lesson')) {
      setParams({ lesson: enrollment.lastLessonId });
    }
  }, [enrollment]);

  const markMutation = useMutation({
    mutationFn: () => api.patch(`/enrollments/${enrollment?._id}/lesson`, { lessonId: currentLesson._id }),
    onSuccess: () => { toast.success('Leçon marquée comme terminée !'); qc.invalidateQueries(['enrollment', id]); },
  });

  const isCompleted = enrollment?.completedLessons?.includes(currentLesson?._id);
  const prev = lessons[currentIndex - 1];
  const next = lessons[currentIndex + 1];

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;
  if (!courseData?.isEnrolled) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <p className="text-gray-600">Vous n'êtes pas inscrit à ce cours.</p>
      <Button onClick={() => navigate(`/courses/${id}`)}>Voir le cours</Button>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col overflow-hidden shrink-0`}>
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-sm truncate">{courseData.subject || courseData.title}</h2>
          <div className="flex items-center gap-2 mt-0.5 mb-3">
            <span className="text-xs text-gray-400">{courseData.classe}{courseData.serie ? ` — Série ${courseData.serie}` : ''}</span>
          </div>
          <ProgressBar value={enrollment?.progress || 0} showLabel />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {lessons.map((lesson, i) => {
            const done = enrollment?.completedLessons?.includes(lesson._id);
            const active = lesson._id === currentLesson?._id;
            const hasVideo = !!lesson.videoUrl;
            const hasPdf = lesson.pdfUrls?.length > 0;
            return (
              <button key={lesson._id} onClick={() => setParams({ lesson: lesson._id })}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'}`}>
                {done
                  ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  : <Circle className={`h-4 w-4 shrink-0 ${active ? 'text-blue-400' : 'text-gray-200'}`} />}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${active ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
                    {i + 1}. {lesson.title.toUpperCase()}
                  </div>
                  <div className="flex gap-1 mt-0.5">
                    {hasVideo && <Play className="h-2.5 w-2.5 text-blue-400" />}
                    {hasPdf && <FileText className="h-2.5 w-2.5 text-red-400" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button onClick={() => navigate('/student')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 hover:bg-gray-100 px-2 py-1.5 rounded-lg shrink-0">
            <ChevronLeft className="h-4 w-4" /> Mon espace
          </button>
          <span className="text-sm font-semibold text-gray-800 flex-1 truncate uppercase">
            {currentLesson?.title}
          </span>
          {isCompleted ? (
            <span className="flex items-center gap-1.5 text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-lg">
              <CheckCircle className="h-4 w-4" /> Terminé
            </span>
          ) : (
            <Button size="sm" onClick={() => markMutation.mutate()} loading={markMutation.isPending}>
              <CheckCircle className="h-4 w-4" /> Marquer terminé
            </Button>
          )}
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">
            {currentLesson
              ? <>
                  <LessonContent lesson={currentLesson} />
                  <ExercisesSection lessonId={currentLesson._id} />
                </>
              : <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                  <BookOpen className="h-16 w-16 mb-4 opacity-40" />
                  <p>Sélectionnez une leçon dans la liste</p>
                </div>
            }
          </div>
        </div>

        {/* Bottom nav */}
        <div className="bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between shrink-0">
          <Button variant="secondary" size="sm" disabled={!prev} onClick={() => prev && setParams({ lesson: prev._id })}>
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          {enrollment?.progress === 100 && (
            <Button variant="outline" size="sm" onClick={() => navigate('/student/certificates')}>
              <Award className="h-4 w-4" /> Mes certificats
            </Button>
          )}
          <Button size="sm" disabled={!next} onClick={() => next && setParams({ lesson: next._id })}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
