import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import Footer from '../../components/layout/Footer';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Lien de vérification invalide');
      return;
    }
    api.post('/auth/verify-email', { token })
      .then((res) => { setStatus('success'); setMessage(res.data.message); })
      .catch((e) => { setStatus('error'); setMessage(e.response?.data?.message || 'Lien invalide ou expiré'); });
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 to-primary/10 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          {status === 'loading' && (
            <>
              <Spinner size="lg" className="mb-4" />
              <p className="text-sm text-gray-500">Vérification en cours…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="h-14 w-14 bg-success-light rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-success" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Email vérifié</h1>
              <p className="text-sm text-gray-500 mb-6">{message}</p>
              <Link to="/login" className="text-brand-dark font-medium hover:underline text-sm">Se connecter</Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="h-14 w-14 bg-danger-light rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="h-7 w-7 text-danger" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 mb-2">Échec de la vérification</h1>
              <p className="text-sm text-gray-500 mb-6">{message}</p>
              <Link to="/login" className="text-brand-dark font-medium hover:underline text-sm">Retour à la connexion</Link>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
