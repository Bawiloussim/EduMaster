import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { GraduationCap, ArrowLeft, MailCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { CLASSES, SERIES, SERIE_LABELS, requiresSerie } from '../../utils/schoolData';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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

/* ── Diamond education pattern (same as Login/Landing/Home) ─────────────── */
function EduPattern({ opacity = '0.06' }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        opacity,
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M30 5L5 20v10l25 15 25-15V20L30 5zm0 4l21 12.5v8L30 41.5 9 29.5v-8L30 9zm0 4L13 22.5v4L30 37l17-10.5v-4L30 13z'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px',
      }} />
  );
}

/* ── Feature bullets for the left panel ──────────────────────────────────── */
function LeftPanelFeatures() {
  const items = [
    { emoji: '📚', label: 'Cours illimités, gratuits pour toujours' },
    { emoji: '🏅', label: 'Attestations et certificats reconnus' },
    { emoji: '📊', label: 'Bulletins et suivi de progression automatiques' },
  ];
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-3">
          <span className="text-xl leading-none shrink-0">{it.emoji}</span>
          <p className="text-sm text-brand-light">{it.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function Register() {
  const { register: signup, registerWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'admin' ? 'admin' : 'student';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const [role, setRole] = useState(defaultRole);
  const [schoolId, setSchoolId] = useState('');
  const [classe, setClasse] = useState('');
  const [serie, setSerie] = useState('');
  const [pending, setPending] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const needsSerie = classe && requiresSerie(classe);

  const { data: schools } = useQuery({
    queryKey: ['schools-public'],
    queryFn: () => api.get('/schools/public').then((r) => r.data.data),
  });

  const validatePrerequisites = () => {
    if (!schoolId) { toast.error('Choisissez votre établissement'); return false; }
    if (role === 'student' && (!classe || (needsSerie && !serie))) {
      toast.error(needsSerie ? 'Choisissez votre classe et votre série' : 'Choisissez votre classe');
      return false;
    }
    return true;
  };

  const onSubmit = async (data) => {
    if (!validatePrerequisites()) return;
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
      navigate('/home');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la création du compte');
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    if (!validatePrerequisites()) return;
    setGoogleLoading(true);
    try {
      const result = await registerWithGoogle({
        credential: credentialResponse.credential, role, schoolId,
        ...(role === 'student' ? { classe, serie: needsSerie ? serie : null } : {}),
      });
      if (result.pending) {
        setPending(result.message);
        return;
      }
      toast.success('Compte créé ! Bienvenue sur EduMaster.');
      navigate('/home');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la connexion Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (pending) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <Link to="/" className="w-full max-w-md flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
          </Link>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
            <div className="flex flex-col items-center text-center py-4">
              <div className="h-14 w-14 bg-brand/15 rounded-full flex items-center justify-center mb-4">
                <MailCheck className="h-7 w-7 text-brand-dark" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Demande envoyée</h1>
              <p className="text-sm text-gray-500 mb-6">{pending}</p>
              <Link to="/login" className="text-brand-dark font-medium hover:underline text-sm">Retour à la connexion</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-4">
      <Link to="/" className="w-full max-w-4xl flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-3">
        <ArrowLeft className="h-4 w-4" /> Retour à l'accueil
      </Link>
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden grid md:grid-cols-2">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between bg-primary relative p-10 overflow-hidden">
          <EduPattern />
          <div className="relative">
            <h1 className="text-3xl font-extrabold text-white mb-3">Rejoignez-nous !</h1>
            <p className="text-lg font-semibold text-white mb-3">Créez votre compte gratuitement</p>
            <p className="text-sm text-brand-light leading-relaxed max-w-sm">
              Élève ou établissement, accédez à tous les outils EduMaster en quelques minutes.
            </p>
          </div>
          <div className="relative">
            <LeftPanelFeatures />
          </div>
        </div>

        {/* Right panel — form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-brand" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-primary text-base leading-none block">EduMaster</span>
              <span className="text-xs text-gray-400">Plateforme de formation</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Créer un compte</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">Rejoignez EduMaster gratuitement</p>

          <div className="space-y-4 mb-4">
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
          </div>

          {GOOGLE_CLIENT_ID && (
            <>
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <div className="flex justify-center [&>div]:w-full">
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={() => toast.error('Connexion Google impossible')}
                    text="signup_with"
                    width="336"
                  />
                </div>
              </GoogleOAuthProvider>
              {googleLoading && <p className="text-center text-xs text-gray-400 mt-2">Création du compte…</p>}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou avec un mot de passe</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nom complet" placeholder="Jean Dupont" error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" placeholder="vous@exemple.com" error={errors.email?.message} {...register('email')} />
            <Input label="Mot de passe" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Input label="Confirmer le mot de passe" type="password" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-brand-dark font-medium hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
