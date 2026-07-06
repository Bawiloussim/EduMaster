import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/ui/Button';
import { CLASSES, SERIES, SERIE_LABELS } from '../../utils/schoolData';

export default function ChooseClass() {
  const navigate = useNavigate();
  const { user, setClasse: saveClasse } = useAuth();
  const [classe, setClasse] = useState('');
  const [serie, setSerie] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!classe || !serie) {
      toast.error('Choisissez votre classe et votre série');
      return;
    }
    setSubmitting(true);
    try {
      await saveClasse(classe, serie);
      toast.success('Classe enregistrée ! Vos cours et évaluations sont prêts.');
      navigate('/student');
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'enregistrement de la classe");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-[#003580] rounded-xl flex items-center justify-center mb-3">
            <GraduationCap className="h-7 w-7 text-[#0ea5e9]" />
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
                    classe === c ? 'border-[#003580] bg-[#003580] text-white' : 'border-gray-200 text-gray-600 hover:border-[#003580]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Ma série</label>
            <div className="grid grid-cols-2 gap-3">
              {SERIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSerie(s)}
                  className={`border-2 rounded-lg p-3 text-sm font-semibold transition-colors ${
                    serie === s ? 'border-[#0ea5e9] bg-[#0ea5e9] text-white' : 'border-gray-200 text-gray-600 hover:border-[#0ea5e9]'
                  }`}
                >
                  {SERIE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" loading={submitting}>
            Valider ma classe
          </Button>
        </form>
      </div>
    </div>
  );
}
