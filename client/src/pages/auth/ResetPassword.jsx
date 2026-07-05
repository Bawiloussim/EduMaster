import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async ({ password }) => {
    try {
      await api.post('/auth/reset-password', { token: params.get('token'), password });
      toast.success('Mot de passe réinitialisé !');
      navigate('/login');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Lien invalide ou expiré');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Nouveau mot de passe</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nouveau mot de passe" type="password" {...register('password', { required: true, minLength: 6 })} />
          <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>Réinitialiser</Button>
        </form>
      </div>
    </div>
  );
}
