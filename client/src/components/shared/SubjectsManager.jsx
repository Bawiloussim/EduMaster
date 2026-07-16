import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import { requiresSerie } from '../../constants/academic';
import { ALL_SUBJECTS } from '../../utils/schoolData';

function SubjectCatalogue() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [filter, setFilter] = useState('');
  const [checked, setChecked] = useState(new Set());

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

  const bulkCreateMutation = useMutation({
    mutationFn: async (names) => Promise.allSettled(names.map((n) => api.post('/subjects', { name: n }))),
    onSuccess: (results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok) toast.success(`${ok} matière(s) ajoutée(s)`);
      if (failed) toast.error(`${failed} matière(s) non ajoutée(s) (déjà existante(s) ou erreur)`);
      setChecked(new Set());
      invalidate();
    },
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

  const existingNames = new Set((subjects || []).map((s) => s.name.toLowerCase()));
  const suggestions = ALL_SUBJECTS.filter((s) =>
    !existingNames.has(s.toLowerCase()) && s.toLowerCase().includes(filter.trim().toLowerCase()));

  const toggle = (s) => setChecked((prev) => {
    const next = new Set(prev);
    if (next.has(s)) next.delete(s); else next.add(s);
    return next;
  });

  const addSelected = () => { if (checked.size) bulkCreateMutation.mutate([...checked]); };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-4">Matières de l'établissement</h2>

      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Sélectionnez une ou plusieurs matières à ajouter d'un clic.</p>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Rechercher une matière…"
          className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <div className="max-h-48 overflow-y-auto flex flex-wrap gap-2 p-1">
          {suggestions.length === 0
            ? <p className="text-sm text-gray-400 py-2">Aucune suggestion</p>
            : suggestions.map((s) => {
              const active = checked.has(s);
              return (
                <button
                  type="button"
                  key={s}
                  onClick={() => toggle(s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-300 hover:border-brand'}`}
                >
                  {s}
                </button>
              );
            })}
        </div>
        <div className="flex justify-end mt-2">
          <Button type="button" size="sm" onClick={addSelected} loading={bulkCreateMutation.isPending} disabled={!checked.size}>
            <Plus className="h-4 w-4" /> Ajouter la sélection ({checked.size})
          </Button>
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-2 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          list="subject-suggestions"
          placeholder="Autre matière (non listée)"
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

function classLabel(c) { return `${c.classe}${requiresSerie(c.classe) ? ` ${c.serie}` : ''}`; }
function comboKey(classe, serie) { return `${classe}|${serie || ''}`; }

function SubjectAssignments() {
  const qc = useQueryClient();
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedClasses, setSelectedClasses] = useState(new Set());

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
  const { data: allCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['school-all-courses'],
    queryFn: () => api.get('/courses/admin/all', { params: { limit: 1000 } }).then((r) => r.data.data),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['school-all-courses'] });
    qc.invalidateQueries({ queryKey: ['school-setup-status'] });
  };

  // Assigning is idempotent server-side (POST returns the existing Course if
  // one already matches), so firing one request per selected class is safe
  // even if some of them already have this subject/teacher combo.
  const assignMutation = useMutation({
    mutationFn: (classIds) => Promise.allSettled(
      classIds.map((classId) => api.post(`/classes/${classId}/courses`, { subjectId, teacherId }))
    ),
    onSuccess: (results) => {
      const ok = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - ok;
      if (ok) toast.success(`Matière affectée à ${ok} classe${ok > 1 ? 's' : ''}`);
      if (failed) toast.error(`${failed} affectation(s) en échec`);
      setSelectedClasses(new Set());
      invalidate();
    },
  });

  const unassignMutation = useMutation({
    mutationFn: ({ classId, courseId }) => api.delete(`/classes/${classId}/courses/${courseId}`),
    onSuccess: () => { toast.success('Affectation retirée'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const toggleClass = (id) => setSelectedClasses((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const submit = (e) => {
    e.preventDefault();
    if (!subjectId || !teacherId) return toast.error('Choisissez une matière et un enseignant');
    if (!selectedClasses.size) return toast.error('Choisissez au moins une classe');
    assignMutation.mutate([...selectedClasses]);
  };

  const college = (classes || []).filter((c) => !requiresSerie(c.classe));
  const lycee = (classes || []).filter((c) => requiresSerie(c.classe));

  // Course docs only carry classe/serie strings — map them back to the
  // Class._id the unassign endpoint expects.
  const classIdByCombo = useMemo(() => {
    const map = new Map();
    (classes || []).forEach((c) => map.set(comboKey(c.classe, c.serie), c._id));
    return map;
  }, [classes]);

  const groups = useMemo(() => {
    const map = new Map();
    (allCourses || []).forEach((c) => {
      const key = `${c.subject}|${c.instructor?._id}`;
      if (!map.has(key)) map.set(key, { subject: c.subject, instructor: c.instructor, courses: [] });
      map.get(key).courses.push(c);
    });
    return [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject));
  }, [allCourses]);

  const renderClassGroup = (title, rows) => rows.length > 0 && (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</span>
      <div className="flex flex-wrap gap-2">
        {rows.map((c) => {
          const active = selectedClasses.has(c._id);
          return (
            <button
              type="button"
              key={c._id}
              onClick={() => toggleClass(c._id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${active ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-300 hover:border-brand'}`}
            >
              {classLabel(c)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-bold text-gray-900 mb-1">Affecter une matière à un enseignant</h2>
      <p className="text-sm text-gray-500 mb-4">
        Un même enseignant peut donner une matière dans plusieurs classes : sélectionnez toutes les classes concernées, l'affectation se fait en une fois.
      </p>

      <form onSubmit={submit} className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
            <option value="">Matière…</option>
            {(subjects || []).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
            <option value="">Enseignant…</option>
            {(instructors || []).map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>

        {classes?.length ? (
          <div className="space-y-4">
            <label className="text-sm font-medium text-gray-700">Classes</label>
            {renderClassGroup('Collège', college)}
            {renderClassGroup('Lycée', lycee)}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Aucune classe créée pour l'instant.</p>
        )}

        <div className="flex justify-end">
          <Button type="submit" loading={assignMutation.isPending} disabled={!subjectId || !teacherId || !selectedClasses.size}>
            Affecter{selectedClasses.size ? ` à ${selectedClasses.size} classe${selectedClasses.size > 1 ? 's' : ''}` : ''}
          </Button>
        </div>
      </form>

      <h3 className="text-sm font-bold text-gray-700 mb-3">Affectations actuelles</h3>
      {coursesLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : groups.length ? (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={`${g.subject}|${g.instructor?._id}`} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 text-sm">
                <span className="font-semibold text-gray-900">{g.subject}</span>
                <span className="text-gray-400">· {g.instructor?.name}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.courses.map((c) => {
                  const classId = classIdByCombo.get(comboKey(c.classe, c.serie));
                  return (
                    <span key={c._id} className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 text-xs font-medium px-2.5 py-1 rounded-full">
                      {c.classe}{c.serie ? ` ${c.serie}` : ''}
                      {classId && (
                        <button type="button" onClick={() => unassignMutation.mutate({ classId, courseId: c._id })} className="hover:text-danger">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Aucune matière affectée pour l'instant</p>
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
      <SubjectAssignments />
    </div>
  );
}
