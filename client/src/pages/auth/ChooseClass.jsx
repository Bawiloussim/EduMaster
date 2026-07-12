import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import { CLASSES, SERIES, SERIE_LABELS, requiresSerie } from '../../utils/schoolData';
import Footer from '../../components/layout/Footer';

export default function ChooseClass() {
  const navigate = useNavigate();
  const { user, setClasse: saveClasse } = useAuth();
  const [classe, setClasse] = useState('');
  const [serie, setSerie] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const needsSerie = classe && requiresSerie(classe);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!classe || (needsSerie && !serie)) {
      toast.error(needsSerie ? 'Choisissez votre classe et votre série' : 'Choisissez votre classe');
      return;
    }
    setSubmitting(true);
    try {
      await saveClasse(classe, needsSerie ? serie : null);
      toast.success('Classe enregistrée ! Vos cours et évaluations sont prêts.');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la classe");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 to-primary/10 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center mb-3">
            <GraduationCap className="h-7 w-7 text-brand" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenue, {user?.name} !</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Choisissez votre classe pour accéder à vos cours, interrogations, devoirs et compositions.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Ma classe</label>
            <div className="grid grid-cols-3 gap-3">
              {CLASSES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setClasse(c)}
                  className={`border-2 rounded-lg p-3 text-sm font-semibold transition-colors ${
                    classe === c ? 'border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {needsSerie && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Ma série</label>
              <div className="grid grid-cols-2 gap-3">
                {SERIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSerie(s)}
                    className={`border-2 rounded-lg p-3 text-sm font-semibold transition-colors ${
                      serie === s ? 'border-brand bg-brand text-white' : 'border-gray-200 text-gray-600 hover:border-brand'
                    }`}
                  >
                    {SERIE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Valider ma classe
          </Button>
        </form>
      </div>
      </div>
      <Footer />
    </div>
  );
}
