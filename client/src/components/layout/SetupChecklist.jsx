import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight } from 'lucide-react';
import api from '../../services/api';

const OPTIONAL_STEPS = [
  { path: 'academic-year', label: 'Configurer l\'année scolaire', done: (s) => s.hasAcademicYear },
  { path: 'classes', label: 'Créer vos classes', done: (s) => !!s.classesCount },
  { path: 'teachers', label: 'Ajouter vos enseignants', done: (s) => !!s.teachersCount },
  { path: 'students', label: 'Ajouter vos élèves', done: (s) => !!s.studentsCount },
  { path: 'subjects', label: 'Créer et affecter vos matières', done: (s) => !!s.coursesCount },
  { path: 'invites', label: 'Inviter d\'autres administrateurs', done: (s) => !!s.coAdminsCount },
];

// Nudges a chef d'établissement back into the onboarding wizard for whatever
// optional setup they haven't finished yet — auto-hides once everything's done.
export default function SetupChecklist() {
  const { data: status } = useQuery({
    queryKey: ['school-setup-status'],
    queryFn: () => api.get('/schools/me/setup-status').then((r) => r.data.data),
  });

  if (!status?.hasSchool) return null;

  const remaining = OPTIONAL_STEPS.filter((s) => !s.done(status));
  if (remaining.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="h-4 w-4 text-brand-dark" />
        <p className="text-sm font-semibold text-gray-900">Terminez la configuration de votre établissement</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {remaining.map((s) => (
          <Link
            key={s.path}
            to={`/onboarding/${s.path}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-dark bg-brand/10 hover:bg-brand/20 px-3 py-1.5 rounded-full transition-colors"
          >
            {s.label} <ArrowRight className="h-3 w-3" />
          </Link>
        ))}
      </div>
    </div>
  );
}
