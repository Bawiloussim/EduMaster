import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import FileInput from '../../../components/ui/FileInput';

const CURRENCIES = ['XAF', 'XOF', 'EUR', 'USD'];
const EMPTY = { name: '', city: '', address: '', phone: '', email: '', currency: 'XAF' };

export default function SchoolStep() {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { refetchStatus } = useOutletContext();
  const [form, setForm] = useState(EMPTY);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');

  const { data: school, isLoading } = useQuery({
    queryKey: ['my-school'],
    queryFn: () => api.get('/schools/me').then((r) => r.data.data),
  });

  useEffect(() => {
    if (!school) return;
    setForm({
      name: school.name || '', city: school.city || '', address: school.address || '',
      phone: school.phone || '', email: school.email || '', currency: school.currency || 'XAF',
    });
    setLogoPreview(school.logo || '');
  }, [school]);

  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const syncUserSchool = (updatedSchool) => {
    setUser({ ...user, school: { _id: updatedSchool._id, name: updatedSchool.name, status: updatedSchool.status } });
  };

  const saveMutation = useMutation({
    mutationFn: () => (school ? api.patch('/schools/me', form) : api.post('/schools/me', form)),
    onSuccess: async (res) => {
      toast.success(school ? 'Établissement mis à jour' : 'Établissement créé');
      syncUserSchool(res.data.data);
      qc.setQueryData(['my-school'], res.data.data);
      refetchStatus();
      if (logoFile) await uploadLogoMutation.mutateAsync();
      if (!school) navigate('/onboarding/academic-year');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('logo', logoFile);
      return api.patch('/schools/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => {
      syncUserSchool(res.data.data);
      qc.setQueryData(['my-school'], res.data.data);
      setLogoFile(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || "Erreur lors de l'envoi du logo"),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Le nom de l'établissement est requis");
    saveMutation.mutate();
  };

  if (isLoading) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <Building2 className="h-5.5 w-5.5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Votre établissement</h1>
          <p className="text-sm text-gray-500">Ces informations seront visibles par vos enseignants et élèves.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4">
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300">
              <Building2 className="h-7 w-7" />
            </div>
          )}
          <div className="flex-1">
            <FileInput accept="image/*" label="Logo de l'établissement (optionnel)" onChange={setLogoFile} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nom de l'établissement" value={form.name} onChange={set('name')} required />
          <Input label="Ville" value={form.city} onChange={set('city')} />
        </div>

        <Input label="Adresse" value={form.address} onChange={set('address')} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Téléphone" value={form.phone} onChange={set('phone')} />
          <Input label="Email de contact" type="email" value={form.email} onChange={set('email')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Devise</label>
            <select value={form.currency} onChange={set('currency')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {school && (
            <Button type="button" variant="secondary" onClick={() => navigate('/admin')}>
              Aller au tableau de bord
            </Button>
          )}
          <Button type="submit" loading={saveMutation.isPending || uploadLogoMutation.isPending}>
            {school ? 'Enregistrer' : 'Créer mon établissement'}
          </Button>
        </div>
      </form>
    </div>
  );
}
