import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../services/api';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Button from '../ui/Button';

const EMPTY = { name: '', email: '', password: '', phone: '', gender: '' };

export default function InstructorFormModal({ open, onClose, instructor, onSaved }) {
  const isEdit = !!instructor;
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(instructor
      ? { name: instructor.name || '', email: instructor.email || '', password: '', phone: instructor.phone || '', gender: instructor.gender || '' }
      : EMPTY);
  }, [open, instructor]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, email: form.email, phone: form.phone, gender: form.gender || null };
      if (!isEdit && form.password) payload.password = form.password;
      return isEdit
        ? api.patch(`/admin/instructors/${instructor._id}`, payload)
        : api.post('/admin/instructors', payload);
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'Formateur modifié' : 'Formateur ajouté');
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Téléphone (optionnel)" value={form.phone} onChange={set('phone')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Genre (optionnel)</label>
            <select value={form.gender} onChange={set('gender')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">Non précisé</option>
              <option value="M">Masculin</option>
              <option value="F">Féminin</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={saveMutation.isPending}>{isEdit ? 'Enregistrer' : 'Ajouter'}</Button>
        </div>
      </form>
    </Modal>
  );
}
