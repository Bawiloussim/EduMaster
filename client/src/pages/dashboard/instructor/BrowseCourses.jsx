import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, Eye, Download } from 'lucide-react';
import api from '../../../services/api';
import { SkeletonTable } from '../../../components/ui/Skeleton';
import PageWrapper from '../../../components/layout/PageWrapper';
import { useAuthStore } from '../../../store/useAuthStore';
import { CLASSES } from '../../../utils/schoolData';

async function downloadProgramme(courseId, title) {
  try {
    const res = await api.get(`/courses/${courseId}/programme-pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `programme-${title.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error('Programme indisponible pour ce cours');
  }
}

export default function BrowseCourses() {
  const { user } = useAuthStore();
  const [classeFilter, setClasseFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['browse-courses', classeFilter, subjectFilter],
    queryFn: () => api.get('/courses', {
      params: { limit: 200, classe: classeFilter || undefined, subject: subjectFilter || undefined },
    }).then(r => r.data),
  });

  // "Cours des collègues" — mes propres cours restent dans "Vue d'ensemble".
  const courses = (data?.data || []).filter((c) => c.instructor?._id !== user?._id);
  const subjects = [...new Set(courses.map((c) => c.subject).filter(Boolean))].sort();

  const groupsByClasse = CLASSES
    .map((classe) => {
      const inClasse = courses.filter((c) => c.classe === classe);
      if (inClasse.length === 0) return null;
      const bySubject = inClasse.reduce((acc, c) => {
        const key = c.subject || 'Sans matière';
        (acc[key] = acc[key] || []).push(c);
        return acc;
      }, {});
      return { classe, subjectGroups: Object.entries(bySubject).sort(([a], [b]) => a.localeCompare(b)) };
    })
    .filter(Boolean);

  return (
    <PageWrapper>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cours des collègues</h1>
        <p className="text-gray-500 mt-1">Consultez et téléchargez les cours publiés par les autres formateurs de votre établissement, par classe et par matière.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setClasseFilter('')}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${!classeFilter ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'}`}>
          Toutes les classes
        </button>
        {CLASSES.map((c) => (
          <button key={c} onClick={() => setClasseFilter(c)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${classeFilter === c ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand'}`}>
            {c}
          </button>
        ))}
        {subjects.length > 0 && (
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-full px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand bg-white text-gray-600"
          >
            <option value="">Toutes les matières</option>
            {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} columns={4} />
      ) : (
        <div className="space-y-6">
          {groupsByClasse.map(({ classe, subjectGroups }) => (
            <div key={classe} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 font-semibold text-gray-900">{classe}</div>
              {subjectGroups.map(([subject, list]) => (
                <div key={subject} className="border-b border-gray-50 last:border-b-0">
                  <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">{subject}</div>
                  <ul className="divide-y divide-gray-50">
                    {list.map((c) => (
                      <li key={c._id} className="flex items-center gap-4 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{c.title}</div>
                          <div className="text-xs text-gray-400">
                            {c.instructor?.name || 'Formateur'}{c.serie ? ` · Série ${c.serie}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.programmePdf?.url && (
                            <button onClick={() => downloadProgramme(c._id, c.title)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                              <Download className="h-3.5 w-3.5" /> Programme
                            </button>
                          )}
                          <Link to={`/courses/${c._id}/learn`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-brand/10 hover:bg-brand/20 text-brand-dark rounded-lg transition-colors">
                            <Eye className="h-3.5 w-3.5" /> Accéder
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
          {groupsByClasse.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucun cours de collègue trouvé</p>
              <p className="text-gray-400 text-sm mt-1">Les cours publiés par les autres formateurs de votre établissement apparaîtront ici.</p>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
