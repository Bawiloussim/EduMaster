import { Users } from 'lucide-react';
import StudentsManager from '../../../components/shared/StudentsManager';
import StepNav from '../StepNav';

export default function StudentsStep() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
          <Users className="h-5.5 w-5.5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Élèves</h1>
          <p className="text-sm text-gray-500">Ajoutez vos élèves un par un ou importez-les en masse.</p>
        </div>
      </div>
      <StudentsManager />
      <StepNav />
    </div>
  );
}
