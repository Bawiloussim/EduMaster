import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarRange } from 'lucide-react';
import api from '../../../services/api';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import StepNav from '../StepNav';

export default function AcademicYearStep() {
  const qc = useQueryClient();
  const { refetchStatus } = useOutletContext();
  const [form, setForm] = useState({ academicYearLabel: '', academicYearStart: '', academicYearEnd: '' });

  const { data: school, isLoading } = useQuery({
    queryKey: ['my-school'],
    queryFn: () => api.get('/schools/me').then((r) => r.data.data),
  });

  useEffect(() => {
    if (!school) return;
    setForm({
      academicYearLabel: school.academicYearLabel || '',
      academicYearStart: school.academicYearStart ? school.academicYearStart.slice(0, 10) : '',
      academicYearEnd: school.academicYearEnd ? school.academicYearEnd.slice(0, 10) : '',
    });
  }, [school]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () => api.patch('/schools/me', form),
    onSuccess: (res) => {
      toast.success('Année scolaire enregistrée');
      qc.setQueryData(['my-school'], res.data.data);
      refetchStatus();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.academicYearLabel.trim()) return toast.error("Indiquez un libellé d'année (ex : 2026-2027)");
    saveMutation.mutate();
  };

  if (isLoading) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <CalendarRange className="h-5.5 w-5.5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Année scolaire</h1>
          <p className="text-sm text-gray-500">Cette information apparaît sur les bulletins et attestations.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Input label="Libellé (ex : 2026-2027)" value={form.academicYearLabel} onChange={set('academicYearLabel')} required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Début" type="date" value={form.academicYearStart} onChange={set('academicYearStart')} />
          <Input label="Fin" type="date" value={form.academicYearEnd} onChange={set('academicYearEnd')} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saveMutation.isPending}>Enregistrer</Button>
        </div>
      </form>

      <StepNav />
    </div>
  );
}
