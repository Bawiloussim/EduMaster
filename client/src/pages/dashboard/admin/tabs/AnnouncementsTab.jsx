import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../../../services/api';
import Spinner from '../../../../components/ui/Spinner';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { CLASSES, SERIES, requiresSerie } from '../../../../constants/academic';

const selectClass = 'text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand bg-white';

const AUDIENCE_LABELS = { all: 'Tous', students: 'Élèves', instructors: 'Formateurs', classe: 'Classe précise' };

export default function AnnouncementsTab() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [classe, setClasse] = useState(CLASSES[0]);
  const [serie, setSerie] = useState(SERIES[0]);
  const needsSerie = requiresSerie(classe);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => api.get('/admin/announcements').then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/announcements', payload),
    onSuccess: (res) => {
      toast.success(`Annonce envoyée à ${res.data.notifiedCount} utilisateur(s)`);
      setTitle(''); setBody('');
      qc.invalidateQueries(['admin-announcements']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    createMutation.mutate({
      title, body, audience,
      ...(audience === 'classe' ? { classe, ...(needsSerie ? { serie } : {}) } : {}),
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 h-fit">
        <h2 className="text-lg font-semibold text-gray-900">Nouvelle annonce</h2>
        <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Audience</label>
          <select className={selectClass} value={audience} onChange={(e) => setAudience(e.target.value)}>
            {Object.entries(AUDIENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {audience === 'classe' && (
          <div className="flex gap-3">
            <select className={selectClass} value={classe} onChange={(e) => setClasse(e.target.value)}>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {needsSerie && (
              <select className={selectClass} value={serie} onChange={(e) => setSerie(e.target.value)}>
                {SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
        )}
        <Button type="submit" loading={createMutation.isPending}>Envoyer l'annonce</Button>
      </form>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Annonces envoyées</h2>
        {isLoading ? <Spinner /> : (
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {data?.map((a) => (
              <div key={a._id} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-medium text-gray-900">{a.title}</div>
                  <span className="text-xs text-gray-400 shrink-0">{new Date(a.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{a.body}</p>
                <div className="text-xs text-gray-400 mt-2">
                  {AUDIENCE_LABELS[a.audience]}{a.audience === 'classe' ? ` · ${a.classe}${a.serie ? ` · ${a.serie}` : ''}` : ''} · par {a.createdBy?.name || '—'}
                </div>
              </div>
            ))}
            {data?.length === 0 && <p className="text-sm text-gray-400">Aucune annonce envoyée</p>}
          </div>
        )}
      </div>
    </div>
  );
}
