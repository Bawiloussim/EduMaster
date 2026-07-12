import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Award, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import PageWrapper from '../../components/layout/PageWrapper';

export default function CertificateVerify() {
  const { hash } = useParams();

  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ['verify-cert', hash],
    queryFn: () => api.get(`/certificates/verify/${hash}`).then(r => r.data.data),
    retry: false,
  });

  return (
    <PageWrapper>
      <div className="max-w-lg mx-auto">
        {isLoading && <div className="text-center py-20"><Spinner size="lg" /></div>}

        {isError && (
          <div className="bg-danger-light border-2 border-danger/30 rounded-2xl p-10 text-center">
            <XCircle className="h-16 w-16 text-danger mx-auto mb-4" />
            <h1 className="text-xl font-bold text-danger mb-2">Certificat introuvable</h1>
            <p className="text-danger">Ce certificat n'existe pas ou a été révoqué.</p>
          </div>
        )}

        {cert && (
          <div className="bg-success-light border-2 border-success/30 rounded-2xl p-10 text-center">
            <CheckCircle className="h-16 w-16 text-success-light0 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-success mb-1">Certificat authentique</h1>
            <p className="text-success mb-6">Ce certificat a été délivré par EduMaster</p>

            <div className="bg-white rounded-xl p-6 text-left space-y-3">
              <div className="flex gap-2">
                <Award className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-400">Apprenant</div>
                  <div className="font-semibold text-gray-900">{cert.student?.name}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Cours certifié</div>
                <div className="font-semibold text-gray-900">{cert.course?.title}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Examen</div>
                <div className="font-medium text-gray-700">{cert.exam?.title}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Date d'émission</div>
                <div className="font-medium text-gray-700">{new Date(cert.issuedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Identifiant unique</div>
                <div className="font-mono text-xs text-gray-500 break-all">{cert.uniqueId}</div>
              </div>
            </div>

            {cert.pdfUrl && (
              <a href={cert.pdfUrl} target="_blank" rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm text-brand-dark hover:underline">
                <ExternalLink className="h-4 w-4" /> Télécharger le certificat PDF
              </a>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
