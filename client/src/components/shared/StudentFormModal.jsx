import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { requiresSerie } from '../../constants/academic';

const EMPTY = { name: '', email: '', password: '', classe: '', serie: '', matricule: '', phone: '', gender: '', birthDate: '' };

export default function StudentFormModal({ open, onClose, student, onSaved }) {
  const isEdit = !!student;
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(student
      ? {
        name: student.name || '', email: student.email || '', password: '',
        classe: student.classe || '', serie: student.serie || '',
        matricule: student.matricule || '', phone: student.phone || '',
        gender: student.gender || '', birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
      }
      : EMPTY);
  }, [open, student]);

  const { data: classes } = useQuery({
    queryKey: ['school-classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
    enabled: open,
  });

  const availableClasses = [...new Set((classes || []).map((c) => c.classe))];
  const availableSeries = (classes || []).filter((c) => c.classe === form.classe).map((c) => c.serie).filter(Boolean);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name, email: form.email,
        classe: form.classe || null, serie: requiresSerie(form.classe) ? form.serie : null,
        matricule: form.matricule, phone: form.phone,
        gender: form.gender || null, birthDate: form.birthDate || null,
      };
      if (!isEdit && form.password) payload.password = form.password;
      return isEdit
        ? api.patch(`/admin/students/${student._id}`, payload)
        : api.post('/admin/students', payload);
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'Élève modifié' : 'Élève ajouté');
      if (!isEdit && res.data?.data?.tempPassword) {
        toast.info(`Mot de passe temporaire : ${res.data.data.tempPassword}`, { duration: 15000 });
      }
      onSaved();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return toast.error('Nom et email requis');
    if (requiresSerie(form.classe) && !form.serie) return toast.error('Série requise pour cette classe');
    saveMutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifier l'élève" : 'Ajouter un élève'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nom complet" value={form.name} onChange={set('name')} required />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} required />
        </div>

        {!isEdit && (
          <Input label="Mot de passe (auto-généré si vide)" type="password" value={form.password} onChange={set('password')} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Classe</label>
            <select value={form.classe} onChange={set('classe')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">Aucune</option>
              {availableClasses.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {availableClasses.length === 0 && (
              <p className="text-xs text-warning">Créez d'abord une classe dans l'onglet Classes.</p>
            )}
          </div>
          {requiresSerie(form.classe) && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Série</label>
              <select value={form.serie} onChange={set('serie')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand">
                <option value="">Choisir…</option>
                {availableSeries.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Matricule (optionnel)" value={form.matricule} onChange={set('matricule')} />
          <Input label="Téléphone (optionnel)" value={form.phone} onChange={set('phone')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Genre (optionnel)</label>
            <select value={form.gender} onChange={set('gender')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">Non précisé</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
          <Input label="Date de naissance (optionnelle)" type="date" value={form.birthDate} onChange={set('birthDate')} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={saveMutation.isPending}>{isEdit ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </form>
    </Modal>
  );
}
