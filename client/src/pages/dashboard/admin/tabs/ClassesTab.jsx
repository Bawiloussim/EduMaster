import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, GraduationCap, Users, Plus, Trash2, Search } from 'lucide-react';
import api from '../../../../services/api';
import Spinner from '../../../../components/ui/Spinner';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import { CLASSES, SERIES, requiresSerie } from '../../../../constants/academic';

const ACCENTS = {
  teal: { badge: 'bg-teal-50 text-teal-600', pillActive: 'bg-teal-50 text-teal-700', header: 'from-teal-50/60' },
  blue: { badge: 'bg-brand/10 text-brand-dark', pillActive: 'bg-brand/10 text-brand-dark', header: 'from-brand/10/60' },
};

function CountPill({ value, color }) {
  if (!value) return <span className="text-sm text-gray-300">0</span>;
  return (
    <span className={`inline-flex min-w-[2.25rem] justify-center px-2.5 py-1 rounded-full text-sm font-bold ${ACCENTS[color].pillActive}`}>
      {value}
    </span>
  );
}

function HeaderStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

function TeacherSelect({ value, instructors, color, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`text-xs font-medium rounded-lg px-2 py-1.5 border-0 focus:outline-none focus:ring-1 focus:ring-brand ${value ? ACCENTS[color].pillActive : 'bg-gray-100 text-gray-500'}`}
    >
      <option value="">Non affecté</option>
      {instructors.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
    </select>
  );
}

function SectionCard({ icon: Icon, title, accent, rows, children }) {
  const totalStudents = rows.reduce((s, r) => s + r.studentsCount, 0);
  const a = ACCENTS[accent];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r ${a.header} to-white`}>
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${a.badge}`}>
            <Icon className="h-5.5 w-5.5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <HeaderStat icon={Users} value={totalStudents} label="élèves" />
      </div>
      {rows.length === 0
        ? <p className="px-6 py-8 text-center text-gray-400 text-sm">Aucune classe créée</p>
        : children}
    </div>
  );
}

function CollegeTable({ rows, instructors, onAssign, onDelete }) {
  return (
    <SectionCard icon={Layers} title="Collège" accent="teal" rows={rows}>
      <table className="w-full text-base">
        <thead>
          <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-6 py-3.5 text-left font-semibold">Classe</th>
            <th className="px-6 py-3.5 text-left font-semibold">Professeur principal</th>
            <th className="px-6 py-3.5 text-center font-semibold">Élèves</th>
            <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((c) => (
            <tr key={c._id} className="hover:bg-gray-50/60 transition-colors">
              <td className="px-6 py-4 font-semibold text-gray-900">{c.classe}</td>
              <td className="px-6 py-4">
                <TeacherSelect value={c.mainTeacher?._id} instructors={instructors} color="teal" onChange={(id) => onAssign(c._id, id)} />
              </td>
              <td className="px-6 py-4 text-center"><CountPill value={c.studentsCount} color="teal" /></td>
              <td className="px-6 py-4 text-right">
                <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-light transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

function LyceeTable({ rows, instructors, onAssign, onDelete }) {
  const byClasse = [];
  rows.forEach((r) => {
    const group = byClasse.find((g) => g.classe === r.classe);
    if (group) group.series.push(r);
    else byClasse.push({ classe: r.classe, series: [r] });
  });

  return (
    <SectionCard icon={GraduationCap} title="Lycée" accent="blue" rows={rows}>
      <table className="w-full text-base">
        <thead>
          <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-6 py-3.5 text-left font-semibold">Classe</th>
            <th className="px-6 py-3.5 text-left font-semibold">Série</th>
            <th className="px-6 py-3.5 text-left font-semibold">Professeur principal</th>
            <th className="px-6 py-3.5 text-center font-semibold">Élèves</th>
            <th className="px-6 py-3.5 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {byClasse.map((group) => (
            group.series.map((c, i) => (
              <tr key={c._id} className="hover:bg-gray-50/60 transition-colors">
                {i === 0 && (
                  <td className="px-6 py-4 font-semibold text-gray-900 align-top" rowSpan={group.series.length}>
                    {group.classe}
                  </td>
                )}
                <td className="px-6 py-4 text-gray-500 font-medium">{c.serie}</td>
                <td className="px-6 py-4">
                  <TeacherSelect value={c.mainTeacher?._id} instructors={instructors} color="blue" onChange={(id) => onAssign(c._id, id)} />
                </td>
                <td className="px-6 py-4 text-center"><CountPill value={c.studentsCount} color="blue" /></td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-danger hover:bg-danger-light transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

function CreateClassModal({ open, onClose, existing, onCreated }) {
  const [classe, setClasse] = useState('');
  const [serie, setSerie] = useState('');

  const createMutation = useMutation({
    mutationFn: () => api.post('/classes', { classe, serie: requiresSerie(classe) ? serie : null }),
    onSuccess: () => {
      toast.success('Classe créée');
      setClasse(''); setSerie('');
      onCreated();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const takenSeries = existing.filter((c) => c.classe === classe).map((c) => c.serie);
  const isTaken = (c, s) => existing.some((e) => e.classe === c && e.serie === (requiresSerie(c) ? s : null));

  const submit = (e) => {
    e.preventDefault();
    if (!classe) return toast.error('Choisissez une classe');
    if (requiresSerie(classe) && !serie) return toast.error('Choisissez une série');
    if (isTaken(classe, serie)) return toast.error('Cette classe existe déjà');
    createMutation.mutate();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle classe">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Classe</label>
          <select value={classe} onChange={(e) => { setClasse(e.target.value); setSerie(''); }} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand">
            <option value="">Choisir…</option>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {requiresSerie(classe) && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Série</label>
            <select value={serie} onChange={(e) => setSerie(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">Choisir…</option>
              {SERIES.filter((s) => !takenSeries.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Annuler</Button>
          <Button type="submit" loading={createMutation.isPending}>Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ClassesTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['school-classes'],
    queryFn: () => api.get('/classes').then(r => r.data.data),
  });

  const { data: instructors } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/instructors').then(r => r.data.data),
  });

  const invalidate = () => qc.invalidateQueries(['school-classes']);

  const assignMutation = useMutation({
    mutationFn: ({ id, mainTeacher }) => api.patch(`/classes/${id}`, { mainTeacher }),
    onSuccess: () => { toast.success('Professeur principal mis à jour'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/classes/${id}`),
    onSuccess: () => { toast.success('Classe supprimée'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const handleDelete = (c) => {
    if (c.studentsCount > 0) {
      if (!window.confirm(`Cette classe compte ${c.studentsCount} élève(s). La supprimer ne supprime pas leurs comptes, seulement la classe. Continuer ?`)) return;
    } else if (!window.confirm('Supprimer cette classe ?')) return;
    deleteMutation.mutate(c._id);
  };

  const rows = useMemo(() => {
    const list = data || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c) => c.classe.toLowerCase().includes(q) || (c.serie || '').toLowerCase().includes(q));
  }, [data, search]);

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const college = rows.filter((c) => !requiresSerie(c.classe));
  const lycee = rows.filter((c) => requiresSerie(c.classe));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une classe…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
          />
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvelle classe
        </Button>
      </div>

      <CreateClassModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        existing={data || []}
        onCreated={() => { setCreateOpen(false); invalidate(); }}
      />

      <div className="space-y-8">
        <CollegeTable rows={college} instructors={instructors || []} onAssign={(id, mainTeacher) => assignMutation.mutate({ id, mainTeacher })} onDelete={handleDelete} />
        <LyceeTable rows={lycee} instructors={instructors || []} onAssign={(id, mainTeacher) => assignMutation.mutate({ id, mainTeacher })} onDelete={handleDelete} />
      </div>
    </div>
  );
}
