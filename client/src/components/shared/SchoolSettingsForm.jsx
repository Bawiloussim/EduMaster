import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import api from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import Input from '../ui/Input';
import Button from '../ui/Button';
import FileInput from '../ui/FileInput';

const CURRENCIES = [
  { code: 'XAF', label: 'XAF — Franc CFA (CEMAC)' },
  { code: 'XOF', label: 'XOF — Franc CFA (UEMOA)' },
  { code: 'GHS', label: 'GHS — Cedi ghanéen' },
  { code: 'NGN', label: 'NGN — Naira nigérian' },
  { code: 'GNF', label: 'GNF — Franc guinéen' },
  { code: 'CDF', label: 'CDF — Franc congolais' },
  { code: 'RWF', label: 'RWF — Franc rwandais' },
  { code: 'KES', label: 'KES — Shilling kenyan' },
  { code: 'UGX', label: 'UGX — Shilling ougandais' },
  { code: 'TZS', label: 'TZS — Shilling tanzanien' },
  { code: 'ZAR', label: 'ZAR — Rand sud-africain' },
  { code: 'MAD', label: 'MAD — Dirham marocain' },
  { code: 'DZD', label: 'DZD — Dinar algérien' },
  { code: 'TND', label: 'TND — Dinar tunisien' },
  { code: 'EGP', label: 'EGP — Livre égyptienne' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'USD', label: 'USD — Dollar américain' },
  { code: 'GBP', label: 'GBP — Livre sterling' },
  { code: 'CAD', label: 'CAD — Dollar canadien' },
  { code: 'CHF', label: 'CHF — Franc suisse' },
];
const EMPTY = {
  name: '', city: '', address: '', country: '', phone: '', email: '', currency: 'XAF',
  slogan: '', description: '', primaryColor: '', secondaryColor: '',
};

// Shared by the onboarding wizard's school step and the admin dashboard's
// "Paramètres" tab — a chef d'établissement can create the school once here,
// then keep coming back to this same form (e.g. to change the logo) long
// after onboarding is finished.
export default function SchoolSettingsForm({ onSaved, dashboardButton = false }) {
  const { user, setUser } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
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
      name: school.name || '', city: school.city || '', address: school.address || '', country: school.country || '',
      phone: school.phone || '', email: school.email || '', currency: school.currency || 'XAF',
      slogan: school.slogan || '', description: school.description || '',
      primaryColor: school.primaryColor || '', secondaryColor: school.secondaryColor || '',
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
    setUser({
      ...user,
      school: {
        _id: updatedSchool._id, name: updatedSchool.name, status: updatedSchool.status,
        logo: updatedSchool.logo, phone: updatedSchool.phone, email: updatedSchool.email, address: updatedSchool.address,
        city: updatedSchool.city, country: updatedSchool.country, slogan: updatedSchool.slogan,
        description: updatedSchool.description, primaryColor: updatedSchool.primaryColor, secondaryColor: updatedSchool.secondaryColor,
      },
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => (school ? api.patch('/schools/me', form) : api.post('/schools/me', form)),
    onSuccess: async (res) => {
      const wasCreate = !school;
      toast.success(wasCreate ? 'Établissement créé' : 'Établissement mis à jour');
      syncUserSchool(res.data.data);
      qc.setQueryData(['my-school'], res.data.data);
      if (logoFile) await uploadLogoMutation.mutateAsync();
      onSaved?.(wasCreate);
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
          <Input label="Devise ou slogan" value={form.slogan} onChange={set('slogan')} placeholder="Ex : Excellence, discipline, réussite" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            value={form.description}
            onChange={set('description')}
            rows={3}
            placeholder="Brève description de l'établissement"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white resize-none"
          />
        </div>

        <Input label="Adresse" value={form.address} onChange={set('address')} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Ville" value={form.city} onChange={set('city')} />
          <Input label="Pays" value={form.country} onChange={set('country')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Téléphone" value={form.phone} onChange={set('phone')} />
          <Input label="Email de contact" type="email" value={form.email} onChange={set('email')} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Devise (monnaie)</label>
            <select value={form.currency} onChange={set('currency')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Couleur principale (optionnel)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.primaryColor || '#003580'} onChange={set('primaryColor')} className="h-9 w-12 rounded border border-gray-300 cursor-pointer" />
              <Input value={form.primaryColor} onChange={set('primaryColor')} placeholder="#003580" className="flex-1" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Couleur secondaire (optionnel)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.secondaryColor || '#0ea5e9'} onChange={set('secondaryColor')} className="h-9 w-12 rounded border border-gray-300 cursor-pointer" />
              <Input value={form.secondaryColor} onChange={set('secondaryColor')} placeholder="#0ea5e9" className="flex-1" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {dashboardButton && school && (
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
