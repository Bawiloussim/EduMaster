import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import api from '../../../../services/api';
import Modal from '../../../../components/ui/Modal';
import Input from '../../../../components/ui/Input';
import Button from '../../../../components/ui/Button';

const EMPTY = { name: '', email: '', password: '' };

export default function InstructorFormModal({ open, onClose, instructor, onSaved }) {
  const isEdit = !!instructor;
  const [form, setForm] = useState(EMPTY);
  const [subjects, setSubjects] = useState([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [assignedClasses, setAssignedClasses] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(instructor ? { name: instructor.name || '', email: instructor.email || '', password: '' } : EMPTY);
    setSubjects(instructor?.subjects || []);
    setAssignedClasses((instructor?.assignedClasses || []).map((c) => c._id || c));
    setSubjectInput('');
  }, [open, instructor]);

  const { data: classes } = useQuery({
    queryKey: ['school-classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
    enabled: open,
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const addSubject = () => {
    const v = subjectInput.trim();
    if (v && !subjects.includes(v)) setSubjects((s) => [...s, v]);
    setSubjectInput('');
  };

  const toggleClass = (id) => {
    setAssignedClasses((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let id = instructor?._id;
      if (isEdit) {
        await api.patch(`/admin/instructors/${id}`, { name: form.name, email: form.email });
      } else {
        const payload = { name: form.name, email: form.email, subjects };
        if (form.password) payload.password = form.password;
        const res = await api.post('/admin/instructors', payload);
        id = res.data.data._id;
        if (res.data.data.tempPassword) {
          toast.info(`Mot de passe temporaire : ${res.data.data.tempPassword}`, { duration: 15000 });
        }
      }
      await api.patch(`/admin/instructors/${id}/assignments`, { subjects, assignedClasses });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Formateur modifié' : 'Formateur ajouté');
      onSaved();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Nom et email requis');
    saveMutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le formateur' : 'Ajouter un formateur'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nom complet" value={form.name} onChange={set('name')} required />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        </div>

        {!isEdit && (
          <Input label="Mot de passe (auto-généré si vide)" type="password" value={form.password} onChange={set('password')} />
        )}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Matières</label>
          <div className="flex gap-2">
            <input
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubject(); } }}
              placeholder="Ex : Mathématiques"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <Button type="button" variant="outline" onClick={addSubject}>Ajouter</Button>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {subjects.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 bg-brand/10 text-brand-dark text-xs font-medium px-2.5 py-1 rounded-full">
                  {s}
                  <button type="button" onClick={() => setSubjects((prev) => prev.filter((x) => x !== s))} className="hover:text-danger">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Classes affectées</label>
          {(classes || []).length === 0 ? (
            <p className="text-xs text-gray-400">Aucune classe créée pour l'instant.</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {classes.map((c) => (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => toggleClass(c._id)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${assignedClasses.includes(c._id) ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'}`}
                >
                  {c.classe}{c.serie ? ` · ${c.serie}` : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={saveMutation.isPending}>{isEdit ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </form>
    </Modal>
  );
}
