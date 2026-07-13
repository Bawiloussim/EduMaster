import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, Plus, Upload, Pencil, KeyRound, Trash2, ArrowUpDown } from 'lucide-react';
import api from '../../services/api';
import { SkeletonTable } from '../ui/Skeleton';
import Button from '../ui/Button';
import ActionMenu from '../ui/ActionMenu';
import InstructorFormModal from './InstructorFormModal';
import ImportInstructorsModal from '../../pages/dashboard/admin/tabs/ImportInstructorsModal';

// Shared by the admin dashboard's Formateurs tab and the onboarding wizard's
// Teachers step.
export default function TeachersManager() {
  const qc = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('name');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-instructors'],
    queryFn: () => api.get('/admin/instructors').then(r => r.data.data),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-instructors'] });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/instructors/${id}`),
    onSuccess: () => { toast.success('Formateur supprimé'); invalidate(); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/instructors/${id}/reset-password`),
    onSuccess: (res) => toast.success(`Mot de passe réinitialisé : ${res.data.data.tempPassword}`, { duration: 15000 }),
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const rows = useMemo(() => {
    let list = data || [];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.email.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => sortKey === 'name'
      ? a.name.localeCompare(b.name)
      : (b.coursesCount || 0) - (a.coursesCount || 0));
  }, [data, search, sortKey]);

  if (isLoading) return <SkeletonTable rows={6} columns={5} />;

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un formateur…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortKey((k) => k === 'name' ? 'coursesCount' : 'name')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Trier par {sortKey === 'name' ? 'nom' : 'cours'}
          </button>
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4" /> Importer
          </Button>
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>

      <ImportInstructorsModal open={importOpen} onClose={() => setImportOpen(false)} onImported={invalidate} />
      <InstructorFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        instructor={editing}
        onSaved={() => { setFormOpen(false); invalidate(); }}
      />

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
              <th className="px-4 py-3 text-left font-semibold">Formateur</th>
              <th className="px-4 py-3 text-center font-semibold">Cours</th>
              <th className="px-4 py-3 text-center font-semibold">Élèves</th>
              <th className="px-4 py-3 text-center font-semibold">Taux de réussite</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((i) => (
              <tr key={i._id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{i.name}</div>
                  <div className="text-xs text-gray-400">{i.email}</div>
                </td>
                <td className="px-4 py-3 text-center">{i.coursesCount}</td>
                <td className="px-4 py-3 text-center">{i.studentsCount}</td>
                <td className="px-4 py-3 text-center">{i.avgPassRate}%</td>
                <td className="px-4 py-3 text-right">
                  <ActionMenu actions={[
                    { label: 'Modifier', icon: Pencil, onClick: () => { setEditing(i); setFormOpen(true); } },
                    { label: 'Réinitialiser mot de passe', icon: KeyRound, onClick: () => resetPasswordMutation.mutate(i._id) },
                    { label: 'Supprimer', icon: Trash2, danger: true, onClick: () => window.confirm('Supprimer ce formateur ?') && deleteMutation.mutate(i._id) },
                  ]} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Aucun formateur</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
