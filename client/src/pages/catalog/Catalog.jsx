import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Star, Users } from 'lucide-react';
import api from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import PageWrapper from '../../components/layout/PageWrapper';

const LEVELS = [
  { value: '', label: 'Tous les niveaux' },
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];
const LEVEL_COLORS = { beginner: 'green', intermediate: 'yellow', advanced: 'red' };

function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course._id}`} className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      <div className="relative h-40 bg-gradient-to-br from-blue-100 to-indigo-200 overflow-hidden">
        {course.coverImage
          ? <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="flex items-center justify-center h-full"><BookOpen className="h-12 w-12 text-blue-300" /></div>
        }
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge color={LEVEL_COLORS[course.level] || 'blue'}>{LEVELS.find(l => l.value === course.level)?.label || course.level}</Badge>
          {course.category && <span className="text-xs text-gray-400">{course.category}</span>}
        </div>
        <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">{course.title}</h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2 flex-1">{course.description}</p>
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <img src={course.instructor?.avatar || ''} onError={(e) => e.target.style.display = 'none'} alt="" className="h-5 w-5 rounded-full bg-gray-200" />
            <span>{course.instructor?.name || 'Formateur'}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {course.rating > 0 && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-400 fill-current" />{course.rating.toFixed(1)}</span>}
            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{course.enrollmentCount || 0}</span>
            <span className="font-semibold text-green-600">{course.price === 0 ? 'Gratuit' : `${course.price}€`}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function Catalog() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', { search, level, category, page }],
    queryFn: () => api.get('/courses', { params: { search, level, category, page, limit: 12 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const courses = data?.data || [];
  const totalPages = data?.pages || 1;

  return (
    <PageWrapper>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Catalogue des cours</h1>
        <p className="text-gray-500">Découvrez notre sélection de cours certifiants</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un cours…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select value={level} onChange={(e) => { setLevel(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <input value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          placeholder="Catégorie…"
          className="border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-40" />
      </div>

      {isLoading ? (
        <Spinner size="lg" className="py-20" />
      ) : courses.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Aucun cours trouvé</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {courses.map((c) => <CourseCard key={c._id} course={c} />)}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition-colors ${page === p ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
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
