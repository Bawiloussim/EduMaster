import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Footer from '../../components/layout/Footer';
import { CLASSES, SERIES, SERIE_LABELS, requiresSerie } from '../../utils/schoolData';

const ROLES = [
  { value: 'student', label: 'Apprenant', emoji: '📚' },
  { value: 'instructor', label: 'Formateur', emoji: '🎓' },
  { value: 'admin', label: "Chef d'établissement", emoji: '🏫' },
];

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] });

export default function Register() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'instructor' ? 'instructor' : 'student';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const [role, setRole] = useState(defaultRole);
  const [schoolId, setSchoolId] = useState('');
  const [classe, setClasse] = useState('');
  const [serie, setSerie] = useState('');
  const [pending, setPending] = useState(null);
  const needsSerie = classe && requiresSerie(classe);

  const { data: schools } = useQuery({
    queryKey: ['schools-public'],
    queryFn: () => api.get('/schools/public').then((r) => r.data.data),
  });

  const onSubmit = async (data) => {
    if (!schoolId) return toast.error('Choisissez votre établissement');
    if (role === 'student' && (!classe || (needsSerie && !serie))) {
      return toast.error(needsSerie ? 'Choisissez votre classe et votre série' : 'Choisissez votre classe');
    }
    try {
      const result = await signup({
        ...data, role, schoolId,
        ...(role === 'student' ? { classe, serie: needsSerie ? serie : null } : {}),
      });
      if (result.pending) {
        setPending(result.message);
        return;
      }
      toast.success('Compte créé ! Bienvenue sur EduMaster.');
      navigate(result.role === 'instructor' ? '/instructor?new=true' : '/home');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la création du compte');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 to-primary/10 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {pending ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="h-14 w-14 bg-brand/15 rounded-full flex items-center justify-center mb-4">
              <MailCheck className="h-7 w-7 text-brand-dark" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée</h1>
            <p className="text-sm text-gray-500 mb-6">{pending}</p>
            <Link to="/login" className="text-brand-dark font-medium hover:underline text-sm">Retour à la connexion</Link>
          </div>
        ) : (
        <>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <GraduationCap className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
          <p className="text-sm text-gray-500 mt-1">Rejoignez EduMaster gratuitement</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nom complet" placeholder="Jean Dupont" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" placeholder="vous@exemple.com" error={errors.email?.message} {...register('email')} />
          <Input label="Mot de passe" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
          <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Je suis un…</label>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((opt) => (
                <label key={opt.value}
                  className={`flex flex-col items-center gap-1 border rounded-lg p-2.5 cursor-pointer transition-colors text-center ${role === opt.value ? 'border-brand bg-brand/10' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="role" value={opt.value} checked={role === opt.value}
                    onChange={() => setRole(opt.value)} className="sr-only" />
                  <span className="text-lg leading-none">{opt.emoji}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Mon établissement</label>
            <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand bg-white">
              <option value="">Choisissez un établissement…</option>
              {schools?.map((s) => (
                <option key={s._id} value={s._id}>{s.name}{s.city ? ` — ${s.city}` : ''}</option>
              ))}
            </select>
          </div>

          {role === 'student' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Ma classe</label>
              <div className="grid grid-cols-4 gap-2">
                {CLASSES.map((c) => (
                  <button key={c} type="button" onClick={() => { setClasse(c); setSerie(''); }}
                    className={`border-2 rounded-lg py-2 text-xs font-semibold transition-colors ${classe === c ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary'}`}>
                    {c}
                  </button>
                ))}
              </div>
              {needsSerie && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SERIES.map((s) => (
                    <button key={s} type="button" onClick={() => setSerie(s)}
                      className={`border-2 rounded-lg py-2 text-xs font-semibold transition-colors ${serie === s ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:border-brand'}`}>
                      {SERIE_LABELS[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {role === 'admin' && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              Votre compte sera activé après validation par un super administrateur EduMaster.
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Créer mon compte
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-brand-dark font-medium hover:underline">Se connecter</Link>
        </p>
        </>
        )}
      </div>
      </div>
      <Footer />
    </div>
  );
}
