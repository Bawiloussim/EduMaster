import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GraduationCap, Check } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import ProgressBar from '../../components/ui/ProgressBar';

const STEPS = [
  { path: 'school', label: 'Établissement', done: (s) => s.hasSchool },
  { path: 'academic-year', label: 'Année scolaire', done: (s) => s.hasAcademicYear },
  { path: 'classes', label: 'Classes', done: (s) => !!s.classesCount },
  { path: 'teachers', label: 'Enseignants', done: (s) => !!s.teachersCount },
  { path: 'students', label: 'Élèves', done: (s) => !!s.studentsCount },
  { path: 'subjects', label: 'Matières', done: (s) => !!s.coursesCount },
  { path: 'invites', label: 'Invitations', done: (s) => !!s.coAdminsCount },
];

export default function OnboardingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['school-setup-status'],
    queryFn: () => api.get('/schools/me/setup-status').then((r) => r.data.data),
  });

  const refetchStatus = () => qc.invalidateQueries({ queryKey: ['school-setup-status'] });

  const currentPath = location.pathname.split('/').pop();
  const currentIndex = STEPS.findIndex((s) => s.path === currentPath);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  // Only "École" is reachable until the school itself exists — every later
  // step needs a school to attach its data to.
  const canVisit = (index) => index === 0 || status?.hasSchool;

  const optionalSteps = STEPS.slice(1);
  const completedOptional = optionalSteps.filter((s) => s.done(status || {})).length;
  const progress = status?.hasSchool ? Math.round((completedOptional / optionalSteps.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5 text-brand" />
            </div>
            <div className="leading-tight">
              <span className="font-extrabold text-primary text-base leading-none block">EduMaster</span>
              <span className="text-xs text-gray-400">Configuration de votre établissement</span>
            </div>
          </div>

          <ProgressBar value={progress} showLabel />

          <nav className="flex flex-wrap gap-2 mt-4">
            {STEPS.map((step, i) => {
              const active = step.path === currentPath;
              const done = status?.hasSchool && step.done(status);
              const reachable = canVisit(i);
              return (
                <button
                  key={step.path}
                  type="button"
                  disabled={!reachable}
                  onClick={() => navigate(`/onboarding/${step.path}`)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active ? 'bg-brand text-white border-brand'
                    : done ? 'bg-success-light text-success border-transparent'
                    : reachable ? 'bg-white text-gray-600 border-gray-200 hover:border-brand'
                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                  }`}
                >
                  {done && <Check className="h-3 w-3" />}
                  {i + 1}. {step.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet context={{ status, refetchStatus, currentIndex, steps: STEPS }} />
      </main>
    </div>
  );
}
