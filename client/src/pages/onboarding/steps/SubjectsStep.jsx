import { BookOpen } from 'lucide-react';
import SubjectsManager from '../../../components/shared/SubjectsManager';
import StepNav from '../StepNav';

export default function SubjectsStep() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <BookOpen className="h-5.5 w-5.5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Matières</h1>
          <p className="text-sm text-gray-500">Créez vos matières et affectez-les aux classes et enseignants.</p>
        </div>
      </div>
      <SubjectsManager />
      <StepNav />
    </div>
  );
}
