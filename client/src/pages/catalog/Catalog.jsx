import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Star, Users } from 'lucide-react';
import api from '../../services/api';
import { SkeletonCourseGrid } from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import PageWrapper from '../../components/layout/PageWrapper';
import { useAuthStore } from '../../store/useAuthStore';
import { CLASSES, SERIES, SERIE_COLORS, CLASSE_COLORS, requiresSerie } from '../../utils/schoolData';

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course._id}`} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      <div className="relative h-40 bg-gradient-to-br from-brand/15 to-primary/10 overflow-hidden">
        {course.coverImage
          ? <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="flex items-center justify-center h-full"><BookOpen className="h-12 w-12 text-brand-light" /></div>
        }
        <div className="absolute top-2 left-2 flex gap-1">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-white/90 text-gray-800`}>{course.classe}</span>
          {course.serie && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${course.serie === 'D' ? 'bg-brand text-white' : 'bg-purple-600 text-white'}`}>
              Série {course.serie}
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-medium text-brand-dark mb-1">{course.subject}</p>
        <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-brand-dark transition-colors line-clamp-2">{course.title}</h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{course.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 overflow-hidden">
              {course.instructor?.avatar
                ? <img src={course.instructor.avatar} alt="" className="h-full w-full object-cover" />
                : course.instructor?.name?.[0]?.toUpperCase()}
            </div>
            <span>{course.instructor?.name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {course.rating > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-400 fill-current" />{course.rating.toFixed(1)}</span>}
            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{course.enrollmentCount || 0}</span>
            <span className="font-semibold text-success">Gratuit</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Catalog() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student' && user?.classe && (requiresSerie(user.classe) ? user?.serie : true);
  const [urlParams] = useSearchParams();
  const [search, setSearch] = useState(urlParams.get('search') || '');
  const [classe, setClasse] = useState(urlParams.get('classe') || '');
  const [serie, setSerie] = useState(urlParams.get('serie') || '');
  const [page, setPage] = useState(1);

  // Sync from URL when navigating from Home
  useEffect(() => {
    setSearch(urlParams.get('search') || '');
    setClasse(urlParams.get('classe') || '');
    setSerie(urlParams.get('serie') || '');
    setPage(1);
  }, [urlParams.toString()]);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', { search, classe, serie, page }],
    queryFn: () => api.get('/courses', { params: { search, classe, serie, page, limit: 12 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const courses = data?.data || [];
  const totalPages = data?.pages || 1;

  const reset = () => { setClasse(''); setSerie(''); setSearch(''); setPage(1); };

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Catalogue des cours</h1>
        <p className="text-gray-500">Cours du secondaire — Séries A4 et D</p>
      </div>

      {/* Filtres par classe — masqués pour les élèves : ils ne voient que leur classe */}
      {isStudent ? (
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-primary text-white">
            Cours de ta classe : {user.classe}{user.serie ? ` — Série ${user.serie}` : ''}
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          <button onClick={() => { setClasse(''); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${!classe ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Toutes les classes
          </button>
          {CLASSES.map(c => (
            <button key={c} onClick={() => { setClasse(c); setPage(1); }}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${classe === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {c}
            </button>
          ))}
          <div className="w-px bg-gray-200 mx-1" />
          <button onClick={() => { setSerie(''); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${!serie ? 'bg-white text-gray-600 border-gray-200' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Toutes séries
          </button>
          <button onClick={() => { setSerie('A4'); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${serie === 'A4' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-200 hover:bg-purple-50'}`}>
            Série A4 — Littéraire
          </button>
          <button onClick={() => { setSerie('D'); setPage(1); }}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${serie === 'D' ? 'bg-brand text-white border-brand' : 'bg-white text-brand-dark border-brand/25 hover:bg-brand/10'}`}>
            Série D — Scientifique
          </button>
        </div>
      )}

      {/* Barre de recherche */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher une matière, un cours…"
          className="w-full max-w-md pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {(search || classe || serie) && (
          <button onClick={reset} className="ml-3 text-sm text-gray-400 hover:text-gray-600">Réinitialiser</button>
        )}
      </div>

      {isLoading ? (
        <SkeletonCourseGrid count={8} />
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun cours trouvé pour ces critères</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{data?.total} cours trouvé{data?.total > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map(c => <CourseCard key={c._id} course={c} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-brand text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
