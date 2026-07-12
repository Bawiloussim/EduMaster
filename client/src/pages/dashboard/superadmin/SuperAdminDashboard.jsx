import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { School, UserCheck, Plus, Ban, PlayCircle, Trash2, Check, X } from 'lucide-react';
import api from '../../../services/api';
import Skeleton, { SkeletonTable } from '../../../components/ui/Skeleton';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import DashboardSidebar from '../../../components/layout/DashboardSidebar';
import DashboardTopbar from '../../../components/layout/DashboardTopbar';
import Footer from '../../../components/layout/Footer';

const TAB_TITLES = { schools: 'Établissements', approvals: "Demandes d'approbation" };

const SIDEBAR_SECTIONS = [
  {
    label: 'Général',
    items: [
      { id: 'schools', label: 'Établissements', icon: School },
      { id: 'approvals', label: "Demandes d'approbation", icon: UserCheck },
    ],
  },
];

function SchoolsTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-schools'],
    queryFn: () => api.get('/schools').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post('/schools', { name, city }),
    onSuccess: () => {
      toast.success('Établissement créé');
      setModalOpen(false);
      setName(''); setCity('');
      qc.invalidateQueries({ queryKey: ['superadmin-schools'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/schools/${id}/status`, { status }),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      qc.invalidateQueries({ queryKey: ['superadmin-schools'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/schools/${id}`),
    onSuccess: () => {
      toast.success('Établissement supprimé');
      qc.invalidateQueries({ queryKey: ['superadmin-schools'] });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  if (isLoading) return <SkeletonTable rows={4} columns={6} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">Gérez les établissements inscrits sur EduMaster</p>
        <Button onClick={() => setModalOpen(true)} size="sm"><Plus className="h-4 w-4" /> Nouvel établissement</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Nom</th>
              <th className="text-left px-4 py-3">Ville</th>
              <th className="text-left px-4 py-3">Statut</th>
              <th className="text-left px-4 py-3">Utilisateurs</th>
              <th className="text-left px-4 py-3">Cours</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.map((s) => (
              <tr key={s._id}>
                <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                <td className="px-4 py-3 text-gray-500">{s.city || '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={s.status === 'active' ? 'green' : 'red'}>{s.status === 'active' ? 'Actif' : 'Suspendu'}</Badge>
                </td>
                <td className="px-4 py-3">{s.usersCount}</td>
                <td className="px-4 py-3">{s.coursesCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => statusMutation.mutate({ id: s._id, status: s.status === 'active' ? 'suspended' : 'active' })}
                      title={s.status === 'active' ? 'Suspendre' : 'Réactiver'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      {s.status === 'active' ? <Ban className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => { if (confirm(`Supprimer ${s.name} ?`)) deleteMutation.mutate(s._id); }}
                      title="Supprimer"
                      className="p-1.5 rounded-lg hover:bg-danger-light text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <p className="text-center text-sm text-gray-400 py-8">Aucun établissement pour le moment</p>}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel établissement">
        <div className="space-y-4">
          <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} placeholder="Lycée Bilingue de Douala" />
          <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala" />
          <Button className="w-full" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>Créer</Button>
        </div>
      </Modal>
    </div>
  );
}

function ApprovalsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['pending-principals'],
    queryFn: () => api.get('/schools/principals/pending').then((r) => r.data.data),
  });

  const approve = useMutation({
    mutationFn: (id) => api.patch(`/schools/principals/${id}/approve`),
    onSuccess: () => { toast.success('Demande approuvée'); qc.invalidateQueries({ queryKey: ['pending-principals'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });
  const reject = useMutation({
    mutationFn: (id) => api.patch(`/schools/principals/${id}/reject`),
    onSuccess: () => { toast.success('Demande refusée'); qc.invalidateQueries({ queryKey: ['pending-principals'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  if (isLoading) return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-40 shrink-0" />
        </div>
      ))}
    </div>
  );

  if (!data?.length) {
    return <p className="text-center text-sm text-gray-400 py-16">Aucune demande en attente</p>;
  }

  return (
    <div className="space-y-3">
      {data.map((p) => (
        <div key={p._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900">{p.name}</p>
            <p className="text-sm text-gray-500">{p.email}</p>
            <p className="text-xs text-gray-400 mt-1">Établissement : {p.school?.name || '—'}{p.school?.city ? ` (${p.school.city})` : ''}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="danger" loading={reject.isPending} onClick={() => reject.mutate(p._id)}>
              <X className="h-4 w-4" /> Refuser
            </Button>
            <Button size="sm" loading={approve.isPending} onClick={() => approve.mutate(p._id)}>
              <Check className="h-4 w-4" /> Approuver
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('schools');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-100 via-gray-50 to-brand/5">
      <DashboardSidebar subtitle="Super Administration" sections={SIDEBAR_SECTIONS} activeId={activeTab} onSelect={setActiveTab} mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <DashboardTopbar title={TAB_TITLES[activeTab]} onMenuClick={() => setMobileNavOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {activeTab === 'schools' && <SchoolsTab />}
          {activeTab === 'approvals' && <ApprovalsTab />}
        </main>
        <Footer />
      </div>
    </div>
  );
}
