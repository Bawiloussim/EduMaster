import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async ({ email }) => {
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Si ce compte existe, un email vous a été envoyé.');
    } catch {
      toast.error('Une erreur est survenue');
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
          <h1 className="text-2xl font-bold text-gray-900">Mot de passe oublié</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">Saisissez votre email pour recevoir un lien de réinitialisation</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Email" type="email" placeholder="vous@exemple.com" {...register('email', { required: true })} />
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Envoyer le lien</Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-brand-dark hover:underline">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}
