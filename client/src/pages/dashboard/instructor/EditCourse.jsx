import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, Save, ChevronLeft, BookOpen, HelpCircle } from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import PageWrapper from '../../../components/layout/PageWrapper';

function AddLessonModal({ open, onClose, courseId, modules, onSuccess }) {
  const [form, setForm] = useState({ title: '', type: 'video', moduleId: '', order: 0, contentUrl: '', content: '', isFreePreview: false });

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      return api.post(`/courses/${courseId}/lessons`, fd);
    },
    onSuccess: () => { toast.success('Leçon ajoutée'); onSuccess(); onClose(); setForm({ title: '', type: 'video', moduleId: '', order: 0, contentUrl: '', content: '', isFreePreview: false }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Ajouter une leçon" size="lg">
      <div className="space-y-4">
        <Input label="Titre" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="video">Vidéo</option>
              <option value="pdf">PDF</option>
              <option value="text">Texte</option>
              <option value="exercise">Exercice</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Module</label>
            <select value={form.moduleId} onChange={e => setForm(f => ({ ...f, moduleId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sans module</option>
              {modules.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
            </select>
          </div>
        </div>
        {(form.type === 'video' || form.type === 'pdf') && (
          <Input label="URL du contenu" value={form.contentUrl} onChange={e => setForm(f => ({ ...f, contentUrl: e.target.value }))} placeholder="https://…" />
        )}
        {(form.type === 'text' || form.type === 'exercise') && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Contenu</label>
            <textarea rows={5} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        )}
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.isFreePreview} onChange={e => setForm(f => ({ ...f, isFreePreview: e.target.checked }))} className="accent-blue-600" />
          Aperçu gratuit (visible sans inscription)
        </label>
        <Button className="w-full" loading={mutation.isPending} onClick={() => mutation.mutate()}>Ajouter la leçon</Button>
      </div>
    </Modal>
  );
}

function AddExamModal({ open, onClose, courseId, onSuccess }) {
  const [form, setForm] = useState({ title: '', duration: 60, passingScore: 70, maxAttempts: 3, questionCount: 0 });

  const mutation = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/exams`, form),
    onSuccess: () => { toast.success('Examen créé'); onSuccess(); onClose(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal open={open} onClose={onClose} title="Créer un examen">
      <div className="space-y-4">
        <Input label="Titre de l'examen" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Durée (min)" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} />
          <Input label="Score requis (%)" type="number" value={form.passingScore} onChange={e => setForm(f => ({ ...f, passingScore: +e.target.value }))} />
          <Input label="Tentatives max" type="number" value={form.maxAttempts} onChange={e => setForm(f => ({ ...f, maxAttempts: +e.target.value }))} />
          <Input label="Questions (0 = toutes)" type="number" value={form.questionCount} onChange={e => setForm(f => ({ ...f, questionCount: +e.target.value }))} />
        </div>
        <Button className="w-full" loading={mutation.isPending} onClick={() => mutation.mutate()}>Créer l'examen</Button>
      </div>
    </Modal>
  );
}

export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [lessonModal, setLessonModal] = useState(false);
  const [examModal, setExamModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-edit', id],
    queryFn: () => api.get(`/courses/${id}`).then(r => r.data.data),
  });

  const { data: examsData } = useQuery({
    queryKey: ['course-exams', id],
    queryFn: () => api.get(`/courses/${id}/exams`).then(r => r.data),
    enabled: !!id,
  });

  const [form, setForm] = useState(null);
  if (!form && course) {
    setForm({ title: course.title, description: course.description, category: course.category, level: course.level });
  }

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/courses/${id}`, form),
    onSuccess: () => { toast.success('Cours sauvegardé'); qc.invalidateQueries(['course-edit', id]); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const addModuleMutation = useMutation({
    mutationFn: () => api.post(`/courses/${id}/modules`, { title: moduleTitle }),
    onSuccess: () => { toast.success('Module ajouté'); setModuleTitle(''); qc.invalidateQueries(['course-edit', id]); },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => api.delete(`/lessons/${lessonId}`),
    onSuccess: () => { toast.success('Leçon supprimée'); qc.invalidateQueries(['course-edit', id]); },
  });

  const invalidate = () => qc.invalidateQueries(['course-edit', id]);

  if (isLoading || !form) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const lessons = course?.lessons || [];
  const modules = course?.modules || [];

  return (
    <PageWrapper>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/instructor')} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Éditer le cours</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            <Save className="h-4 w-4" /> Sauvegarder
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — course info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Informations</h2>
            <Input label="Titre" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
              <textarea rows={4} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
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
          </div>

          {/* Exams */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Examens</h2>
              <Button size="sm" onClick={() => setExamModal(true)}><Plus className="h-4 w-4" /></Button>
            </div>
            {!examsData?.data?.length ? (
              <p className="text-sm text-gray-400">Aucun examen</p>
            ) : examsData.data.map((exam) => (
              <div key={exam._id} className="flex items-center gap-2 py-2 border-t border-gray-50">
                <HelpCircle className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-sm flex-1 truncate">{exam.title}</span>
                <a href={`/instructor/exams/${exam._id}`} className="text-xs text-blue-600 hover:underline">Gérer</a>
              </div>
            ))}
          </div>
        </div>

        {/* Right — modules & lessons */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Modules & Leçons</h2>
              <Button size="sm" onClick={() => setLessonModal(true)}><Plus className="h-4 w-4" /> Leçon</Button>
            </div>

            <div className="flex gap-2 mb-4">
              <Input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} placeholder="Nouveau module…" className="flex-1" />
              <Button size="sm" variant="secondary" disabled={!moduleTitle} loading={addModuleMutation.isPending}
                onClick={() => addModuleMutation.mutate()}>Ajouter</Button>
            </div>

            {lessons.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aucune leçon — commencez par en ajouter une</p>
              </div>
            ) : modules.length > 0 ? (
              modules.sort((a, b) => a.order - b.order).map((mod) => {
                const modLessons = lessons.filter(l => l.moduleId?.toString() === mod._id?.toString());
                return (
                  <div key={mod._id} className="mb-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{mod.title}</div>
                    <div className="space-y-1">
                      {modLessons.sort((a, b) => a.order - b.order).map((l) => (
                        <div key={l._id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group">
                          <span className="text-xs text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded">{l.type}</span>
                          <span className="text-sm text-gray-700 flex-1 truncate">{l.title}</span>
                          <button onClick={() => window.confirm('Supprimer ?') && deleteLessonMutation.mutate(l._id)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="space-y-1">
                {lessons.sort((a, b) => a.order - b.order).map((l) => (
                  <div key={l._id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group">
                    <span className="text-xs text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded">{l.type}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{l.title}</span>
                    <button onClick={() => window.confirm('Supprimer ?') && deleteLessonMutation.mutate(l._id)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddLessonModal open={lessonModal} onClose={() => setLessonModal(false)} courseId={id} modules={modules} onSuccess={invalidate} />
      <AddExamModal open={examModal} onClose={() => setExamModal(false)} courseId={id} onSuccess={invalidate} />
    </PageWrapper>
  );
}
