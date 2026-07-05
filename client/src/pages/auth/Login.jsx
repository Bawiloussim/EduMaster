import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      const user = await login(data.email, data.password);
      toast.success(`Bienvenue, ${user.name} !`);
      const defaultRedirects = { admin: '/admin', instructor: '/instructor', student: '/home' };
      navigate(from || defaultRedirects[user.role] || '/home');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Identifiants incorrects');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#003580] transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-[#003580] rounded-xl flex items-center justify-center mb-3">
            <GraduationCap className="h-7 w-7 text-[#0ea5e9]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="text-sm text-gray-500 mt-1">Accédez à votre espace EduMaster</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" placeholder="vous@exemple.com" error={errors.email?.message} {...register('email')} />
          <Input label="Mot de passe" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />

          <div className="text-right">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">Mot de passe oublié ?</Link>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
            Se connecter
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
