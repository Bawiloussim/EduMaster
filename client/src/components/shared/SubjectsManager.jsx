import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { requiresSerie } from '../../constants/academic';
import { ALL_SUBJECTS } from '../../utils/schoolData';

function SubjectCatalogue() {
  const qc = useQueryClient();
  const [name, setName] = useState('');

  const { data: subjects, isLoading } = useQuery({
    queryKey: ['school-subjects'],
    queryFn: () => api.get('/subjects').then((r) => r.data.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['school-subjects'] });

  const createMutation = useMutation({
    mutationFn: () => api.post('/subjects', { name }),
    onSuccess: () => { toast.success('Matière ajoutée'); setName(''); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/subjects/${id}`),
    onSuccess: () => { toast.success('Matière supprimée'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-4">Matières de l'établissement</h2>
      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          list="subject-suggestions"
          placeholder="Ex : Mathématiques"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <datalist id="subject-suggestions">
          {ALL_SUBJECTS.map((s) => <option key={s} value={s} />)}
        </datalist>
        <Button type="submit" size="sm" loading={createMutation.isPending}><Plus className="h-4 w-4" /> Ajouter</Button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : subjects?.length ? (
        <div className="flex flex-wrap gap-2">
          {subjects.map((s) => (
            <span key={s._id} className="inline-flex items-center gap-1.5 bg-brand/10 text-brand-dark text-sm font-medium px-3 py-1.5 rounded-full">
              {s.name}
              <button type="button" onClick={() => deleteMutation.mutate(s._id)} className="hover:text-danger">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Aucune matière pour l'instant</p>
      )}
    </div>
  );
}

function ClassAssignments() {
  const qc = useQueryClient();
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['school-classes'],
    queryFn: () => api.get('/classes').then((r) => r.data.data),
  });
  const { data: subjects } = useQuery({
    queryKey: ['school-subjects'],
    queryFn: () => api.get('/subjects').then((r) => r.data.data),
  });
  const { data: instructors } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/instructors').then((r) => r.data.data),
  });
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['class-courses', classId],
    queryFn: () => api.get(`/classes/${classId}/courses`).then((r) => r.data.data),
    enabled: !!classId,
  });

  const invalidateCourses = () => {
    qc.invalidateQueries({ queryKey: ['class-courses', classId] });
    qc.invalidateQueries({ queryKey: ['school-setup-status'] });
  };

  const assignMutation = useMutation({
    mutationFn: () => api.post(`/classes/${classId}/courses`, { subjectId, teacherId }),
    onSuccess: () => { toast.success('Matière affectée'); setSubjectId(''); setTeacherId(''); invalidateCourses(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const unassignMutation = useMutation({
    mutationFn: (courseId) => api.delete(`/classes/${classId}/courses/${courseId}`),
    onSuccess: () => { toast.success('Affectation retirée'); invalidateCourses(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!subjectId || !teacherId) return toast.error('Choisissez une matière et un enseignant');
    assignMutation.mutate();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-4">Affecter une matière à une classe</h2>

      <div className="flex flex-col gap-1 mb-4">
        <label className="text-sm font-medium text-gray-700">Classe</label>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
          <option value="">Choisir une classe…</option>
          {(classes || []).map((c) => (
            <option key={c._id} value={c._id}>{c.classe}{requiresSerie(c.classe) ? ` ${c.serie}` : ''}</option>
          ))}
        </select>
      </div>

      {classId && (
        <>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
              <option value="">Matière…</option>
              {(subjects || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
            <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
              <option value="">Enseignant…</option>
              {(instructors || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
            <Button type="submit" loading={assignMutation.isPending}>Affecter</Button>
          </form>

          {coursesLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : courses?.length ? (
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {courses.map((c) => (
                <div key={c._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">{c.subject}</span>
                    <span className="text-gray-400"> · {c.instructor?.name}</span>
                  </div>
                  <button onClick={() => unassignMutation.mutate(c._id)} className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-light transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Aucune matière affectée à cette classe</p>
          )}
        </>
      )}
    </div>
  );
}

// Shared by the admin dashboard's Matières tab and the onboarding wizard's
// Subjects step.
export default function SubjectsManager() {
  return (
    <div className="space-y-6">
      <SubjectCatalogue />
      <ClassAssignments />
    </div>
  );
}
