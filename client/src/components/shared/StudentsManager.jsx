import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Plus, Upload, Pencil, KeyRound, Trash2, ArrowUpDown, Download } from 'lucide-react';
import api from '../../services/api';
import { SkeletonTable } from '../ui/Skeleton';
import Button from '../ui/Button';
import ActionMenu from '../ui/ActionMenu';
import StudentFormModal from './StudentFormModal';
import ImportStudentsModal from '../../pages/dashboard/admin/tabs/ImportStudentsModal';

async function downloadStudentBulletin(studentId, studentName) {
  try {
    const res = await api.get(`/evaluations/bulletin/1/pdf/student/${studentId}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulletin-${studentName || studentId}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error('Bulletin non disponible');
  }
}

// Shared by the admin dashboard's Élèves tab and the onboarding wizard's
// Students step.
export default function StudentsManager() {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [classeFilter, setClasseFilter] = useState('');
  const [sortKey, setSortKey] = useState('name');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-students'],
    queryFn: () => api.get('/admin/students').then(r => r.data.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-students'] });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/students/${id}`),
    onSuccess: () => { toast.success('Élève supprimé'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/students/${id}/reset-password`),
    onSuccess: (res) => toast.success(`Mot de passe réinitialisé : ${res.data.data.tempPassword}`, { duration: 15000 }),
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const classes = useMemo(() => [...new Set((data || []).map((s) => s.classe).filter(Boolean))], [data]);

  const rows = useMemo(() => {
    let list = data || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (classeFilter) list = list.filter((s) => s.classe === classeFilter);
    return [...list].sort((a, b) => sortKey === 'name'
      ? a.name.localeCompare(b.name)
      : (a.classe || '').localeCompare(b.classe || ''));
  }, [data, search, classeFilter, sortKey]);

  if (isLoading) return <SkeletonTable rows={6} columns={6} />;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un élève…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
            />
          </div>
          {classes.length > 0 && (
            <select
              value={classeFilter}
              onChange={(e) => setClasseFilter(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand bg-white"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortKey((k) => k === 'name' ? 'classe' : 'name')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Trier par {sortKey === 'name' ? 'nom' : 'classe'}
          </button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importer
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <ImportStudentsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={invalidate} />
      <StudentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        student={editing}
        onSaved={() => { setFormOpen(false); invalidate(); }}
      />

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-3 text-left font-semibold">Élève</th>
              <th className="px-4 py-3 text-center font-semibold">Niveau</th>
              <th className="px-4 py-3 text-center font-semibold">Cours</th>
              <th className="px-4 py-3 text-center font-semibold">Progression</th>
              <th className="px-4 py-3 text-center font-semibold">Bulletin</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((s) => (
              <tr key={s._id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400">{s.email}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  {s.classe ? <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.classe}{s.serie ? ` · ${s.serie}` : ''}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-center">{s.coursesCount}</td>
                <td className="px-4 py-3 text-center">{s.avgProgress}%</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => downloadStudentBulletin(s._id, s.name)} className="text-brand-dark hover:underline text-xs flex items-center gap-1 justify-center w-full">
                    <Download className="h-3 w-3" /> PDF
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <ActionMenu actions={[
                    { label: 'Modifier', icon: Pencil, onClick: () => { setEditing(s); setFormOpen(true); } },
                    { label: 'Réinitialiser mot de passe', icon: KeyRound, onClick: () => resetPasswordMutation.mutate(s._id) },
                    { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => window.confirm('Supprimer cet élève ?') && deleteMutation.mutate(s._id) },
                  ]} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Aucun élève</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
