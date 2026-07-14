import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { GraduationCap, BookOpen, Award, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
});

/* ── Diamond education pattern (same as Landing/Home) ───────────────────── */
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

/* ── Mini bar chart mock: monthly lesson completions ────────────────────── */
function LessonsBarChart() {
  const bars = [40, 55, 48, 70, 62, 80, 74, 90, 85, 78, 95, 88];
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
      <p className="text-xs font-semibold text-brand-light mb-3">Leçons complétées</p>
      <div className="flex items-end gap-1.5 h-20">
        {bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-brand" style={{ height: `${h}%`, opacity: 0.5 + (h / 200) }} />
        ))}
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {months.map((m) => (
          <span key={m} className="flex-1 text-center text-[8px] text-brand-light">{m}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Donut mock: exam pass rate ──────────────────────────────────────────── */
function PassRateDonut() {
  const rate = 82;
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 flex items-center gap-4">
      <div className="relative h-16 w-16 shrink-0 rounded-full grid place-items-center"
        style={{ background: `conic-gradient(#0ea5e9 ${rate * 3.6}deg, rgba(255,255,255,0.15) 0deg)` }}>
        <div className="h-11 w-11 rounded-full bg-primary grid place-items-center">
          <span className="text-xs font-bold text-white">{rate}%</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-brand-light">Taux de réussite</p>
        <p className="text-[11px] text-brand-light mt-1 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-brand" /> Aux examens
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, registerWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const [rememberMe, setRememberMe] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  // Dashboard roots are role-gated (see AppRouter); a stale `from` pointing into
  // another role's area must not be trusted just because the user is now authenticated.
  const ROLE_RESTRICTED_ROOTS = ['/admin', '/superadmin', '/instructor', '/student', '/choose-class'];

  const redirectAfterLogin = (user) => {
    toast.success(`Bienvenue, ${user.name} !`);
    const defaultRedirects = { admin: '/admin', superadmin: '/superadmin', instructor: '/instructor', student: '/home' };
    const dashLink = defaultRedirects[user.role] || '/home';
    const fromIsRestricted = from && ROLE_RESTRICTED_ROOTS.some((root) => from.startsWith(root)) && !from.startsWith(dashLink);
    navigate(fromIsRestricted ? dashLink : from || dashLink);
  };

  const onSubmit = async (data) => {
    try {
      const user = await login(data.email, data.password);
      redirectAfterLogin(user);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Identifiants incorrects');
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    try {
      const user = await registerWithGoogle({ credential: credentialResponse.credential });
      redirectAfterLogin(user);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Connexion Google impossible');
    } finally {
      setGoogleLoading(false);
    }
  };

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
            <h1 className="text-3xl font-extrabold text-white mb-3">Bienvenue !</h1>
            <p className="text-lg font-semibold text-white mb-3">Connectez-vous à votre espace</p>
            <p className="text-sm text-brand-light leading-relaxed max-w-sm">
              Suivez vos cours, passez vos examens et téléchargez vos certificats — tout en un seul endroit.
            </p>
          </div>
          <div className="relative space-y-3">
            <LessonsBarChart />
            <PassRateDonut />
          </div>
        </div>

        {/* Right panel — form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-8">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-brand" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-primary text-base leading-none block">EduMaster</span>
              <span className="text-xs text-gray-400">Plateforme de formation</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Connexion à votre compte</h2>
          <p className="text-sm text-gray-500 mt-1 mb-6">Accédez à votre espace EduMaster</p>

          {GOOGLE_CLIENT_ID && (
            <>
              <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <div className="flex justify-center [&>div]:w-full">
                  <GoogleLogin
                    onSuccess={onGoogleSuccess}
                    onError={() => toast.error('Connexion Google impossible')}
                    text="signin_with"
                    width="336"
                  />
                </div>
              </GoogleOAuthProvider>
              {googleLoading && <p className="text-center text-xs text-gray-400 mt-2">Connexion…</p>}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">ou avec un mot de passe</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Adresse email" type="email" placeholder="vous@exemple.com" error={errors.email?.message} {...register('email')} />
            <Input label="Mot de passe" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRememberMe((v) => !v)} className="flex items-center gap-2 group">
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rememberMe ? 'bg-brand' : 'bg-gray-300'}`}>
                  <span className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                    style={{ transform: rememberMe ? 'translateX(18px)' : 'translateX(4px)' }} />
                </span>
                <span className="text-sm text-gray-600 group-hover:text-gray-800">Rester connecté</span>
              </button>
              <Link to="/forgot-password" className="text-sm text-brand-dark hover:underline">Mot de passe oublié ?</Link>
            </div>

            <Button type="submit" className="w-full bg-brand hover:bg-brand-dark focus:ring-brand" size="lg" loading={isSubmitting}>
              Se connecter
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-dark font-medium hover:underline">Créer un compte</Link>
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <BookOpen className="h-4 w-4 text-brand" /> Cours illimités
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Award className="h-4 w-4 text-brand" /> Certificats reconnus
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
