import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

const schema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
  confirmPassword: z.string(),
  role: z.enum(['student', 'instructor']),
}).refine((d) => d.password === d.confirmPassword, { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] });

export default function Register() {
  const { register: signup } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'instructor' ? 'instructor' : 'student';
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole },
  });

  const onSubmit = async (data) => {
    try {
      const user = await signup(data.name, data.email, data.password, data.role);
      toast.success('Compte créé ! Bienvenue sur EduMaster.');
      navigate(user.role === 'instructor' ? '/instructor?new=true' : '/home');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de la création du compte');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 to-primary/10 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
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
            <div className="grid grid-cols-2 gap-3">
              {[{ value: 'student', label: 'Apprenant', emoji: '📚' }, { value: 'instructor', label: 'Formateur', emoji: '🎓' }].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 border rounded-lg p-3 cursor-pointer hover:bg-brand/10 has-[:checked]:border-brand/100 has-[:checked]:bg-brand/10 transition-colors">
                  <input type="radio" value={opt.value} {...register('role')} className="accent-brand" />
                  <span className="text-sm">{opt.emoji} {opt.label}</span>
                </label>
              ))}
            </div>
          </div>

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
  );
}
