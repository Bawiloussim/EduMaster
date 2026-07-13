import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import StepNav from '../StepNav';

export default function InvitesStep() {
  const qc = useQueryClient();
  const { refetchStatus } = useOutletContext();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const { data: coAdmins, isLoading } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: () => api.get('/admin/invites').then((r) => r.data.data),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post('/admin/invites', { name, email }),
    onSuccess: (res) => {
      toast.success('Administrateur ajouté');
      toast.info(`Mot de passe temporaire : ${res.data.data.tempPassword}`, { duration: 15000 });
      setName(''); setEmail('');
      qc.invalidateQueries({ queryKey: ['admin-invites'] });
      refetchStatus();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!name || !email) return toast.error('Nom et email requis');
    inviteMutation.mutate();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <UserPlus className="h-5.5 w-5.5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Invitations</h1>
          <p className="text-sm text-gray-500">Invitez d'autres chefs d'établissement à gérer cette école.</p>
        </div>
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Input label="Nom complet" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={inviteMutation.isPending}>
            <UserPlus className="h-4 w-4" /> Inviter
          </Button>
        </div>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : coAdmins?.length ? (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
          {coAdmins.map((a) => (
            <div key={a._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div>
                <span className="font-medium text-gray-900">{a.name}</span>
                <span className="text-gray-400"> · {a.email}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">Aucun autre administrateur pour l'instant</p>
      )}

      <StepNav />
    </div>
  );
}
