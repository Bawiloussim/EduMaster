import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Circle, BookOpen, Play, FileText, ChevronRight, ChevronLeft, Award } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import ProgressBar from '../../components/ui/ProgressBar';

const TYPE_ICONS = { video: Play, pdf: FileText, text: BookOpen, exercise: BookOpen };

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
    queryFn: () => api.get(`/enrollments/course/${id}`).then(r => r.data.data),
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
    onSuccess: () => {
      toast.success('Leçon marquée comme terminée !');
      qc.invalidateQueries(['enrollment', id]);
    },
  });

  const isCompleted = enrollment?.completedLessons?.includes(currentLesson?._id);

  const goTo = (lesson) => setParams({ lesson: lesson._id });
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 text-sm truncate">{courseData.title}</h2>
          <div className="mt-2">
            <ProgressBar value={enrollment?.progress || 0} showLabel />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {lessons.map((lesson, i) => {
            const Icon = TYPE_ICONS[lesson.type] || BookOpen;
            const done = enrollment?.completedLessons?.includes(lesson._id);
            const active = lesson._id === currentLesson?._id;
            return (
              <button key={lesson._id} onClick={() => goTo(lesson)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}>
                {done ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> : <Circle className="h-4 w-4 text-gray-300 shrink-0" />}
                <Icon className="h-4 w-4 shrink-0 opacity-60" />
                <span className="text-sm truncate flex-1">{i + 1}. {lesson.title}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-gray-100">
            <ChevronLeft className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} />
          </button>
          <span className="text-sm font-medium text-gray-700 flex-1">{currentLesson?.title}</span>
          {!isCompleted && (
            <Button size="sm" onClick={() => markMutation.mutate()} loading={markMutation.isPending}>
              <CheckCircle className="h-4 w-4" /> Marquer terminé
            </Button>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" /> Terminé
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {currentLesson?.type === 'video' && currentLesson?.contentUrl && (
            <div className="max-w-4xl mx-auto">
              <div className="aspect-video bg-black rounded-xl overflow-hidden">
                <video controls className="w-full h-full" src={currentLesson.contentUrl} key={currentLesson._id} />
              </div>
            </div>
          )}
          {currentLesson?.type === 'pdf' && currentLesson?.contentUrl && (
            <div className="max-w-4xl mx-auto">
              <iframe src={currentLesson.contentUrl} className="w-full h-[70vh] rounded-xl border" title={currentLesson.title} />
            </div>
          )}
          {(currentLesson?.type === 'text' || currentLesson?.type === 'exercise') && (
            <div className="max-w-3xl mx-auto prose prose-blue">
              <h2>{currentLesson.title}</h2>
              <div className="whitespace-pre-wrap text-gray-700">{currentLesson.content}</div>
            </div>
          )}
          {!currentLesson && <div className="text-center text-gray-400 py-20">Sélectionnez une leçon</div>}
        </div>

        <div className="bg-white border-t px-4 py-3 flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={!prev} onClick={() => prev && goTo(prev)}>
            <ChevronLeft className="h-4 w-4" /> Précédent
          </Button>
          {enrollment?.progress === 100 && (
            <Button variant="outline" size="sm" onClick={() => navigate('/student/certificates')}>
              <Award className="h-4 w-4" /> Voir mes certificats
            </Button>
          )}
          <Button size="sm" disabled={!next} onClick={() => next && goTo(next)}>
            Suivant <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
