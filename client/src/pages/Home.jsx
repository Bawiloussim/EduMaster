import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, BookOpen, Users, Award, ChevronRight, Play, FileText } from 'lucide-react';
import api from '../services/api';
import { CLASSES, SERIES } from '../utils/schoolData';
import { useAuthStore } from '../store/useAuthStore';

/* ── Education background pattern (SVG inline) ──────────────────────────── */
function EduPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.07]"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23003580' fill-opacity='1'%3E%3Cpath d='M30 5L5 20v10l25 15 25-15V20L30 5zm0 4l21 12.5v8L30 41.5 9 29.5v-8L30 9zm0 4L13 22.5v4L30 37l17-10.5v-4L30 13z'/%3E%3C/g%3E%3C/svg%3E")`,
        backgroundSize: '60px 60px' }} />
  );
}

/* ── Stats bar ───────────────────────────────────────────────────────────── */
function StatsBadge({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-sm">
      <Icon className="h-4 w-4 text-[#0ea5e9]" />
      <span className="font-bold text-gray-900 text-sm">{value}</span>
      <span className="text-gray-500 text-xs">{label}</span>
    </div>
  );
}

/* ── Course card ─────────────────────────────────────────────────────────── */
function CourseCard({ course }) {
  return (
    <Link to={`/courses/${course._id}`}
      className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all overflow-hidden group flex flex-col">
      <div className="relative h-36 bg-gradient-to-br from-[#003580] to-[#0ea5e9] overflow-hidden">
        {course.coverImage
          ? <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300" />
          : <div className="flex flex-col items-center justify-center h-full gap-1">
              <BookOpen className="h-10 w-10 text-white/50" />
            </div>}
        <div className="absolute top-2 left-2 flex gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-gray-800">{course.classe}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${course.serie === 'D' ? 'bg-[#0ea5e9]' : 'bg-purple-600'}`}>Série {course.serie}</span>
        </div>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-[11px] font-semibold text-[#0ea5e9] mb-0.5">{course.subject}</p>
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#003580] transition-colors line-clamp-2 flex-1">{course.title}</h3>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
          <div className="flex items-center gap-1.5">
            <div className="h-5 w-5 rounded-full bg-[#003580]/10 flex items-center justify-center text-[10px] font-bold text-[#003580]">
              {course.instructor?.name?.[0]?.toUpperCase()}
            </div>
            <span className="text-[10px] text-gray-400 truncate max-w-[80px]">{course.instructor?.name}</span>
          </div>
          <span className="text-xs font-bold text-green-600">Gratuit</span>
        </div>
      </div>
    </Link>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function Home() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const { user } = useAuthStore();

  const { data: recentData } = useQuery({
    queryKey: ['courses-home', urlParams.toString()],
    queryFn: () => {
      const params = { limit: 8, page: 1 };
      if (urlParams.get('classe')) params.classe = urlParams.get('classe');
      if (urlParams.get('serie')) params.serie = urlParams.get('serie');
      return api.get('/courses', { params }).then(r => r.data);
    },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) navigate(`/catalog?search=${encodeURIComponent(search.trim())}`);
    else navigate('/catalog');
  };

  const courses = recentData?.data || [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-[#e8f0fe] to-[#f0f7ff] overflow-hidden" style={{ minHeight: '480px' }}>
        {/* Tiled education icon pattern */}
        <EduPattern />

        <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-16 pb-12 text-center">
          {/* Title banner */}
          <div className="bg-[#003580] text-white px-8 py-5 rounded-sm shadow-lg mb-6 max-w-2xl w-full">
            <h1 className="text-2xl md:text-3xl font-bold leading-snug">
              EduMaster — Cours du secondaire gratuits avec certificats
            </h1>
            <p className="text-blue-200 text-sm mt-1">Seconde, Première, Terminale · Séries A4 & D · 100% gratuit</p>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full max-w-2xl flex shadow-md">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Quelle matière voulez-vous apprendre ?"
              className="flex-1 px-5 py-3.5 text-sm border-2 border-r-0 border-[#0ea5e9] rounded-l-sm focus:outline-none bg-white text-gray-700 placeholder-gray-400"
            />
            <button type="submit"
              className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold px-6 text-sm rounded-r-sm transition-colors">
              Rechercher
            </button>
          </form>

          {/* Subtitle badge */}
          <div className="mt-4 bg-gray-900 text-white text-sm font-semibold px-5 py-2 rounded-sm">
            Cours gratuits · Bulletins automatiques · Attestations offertes
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <StatsBadge icon={BookOpen} value={recentData?.total || '0'} label="cours publiés" />
            <StatsBadge icon={Users} value="100%" label="gratuit pour tous" />
            <StatsBadge icon={Award} value="✓" label="Attestations offertes" />
          </div>
        </div>
      </section>

      {/* ── Quick filters — hidden for students, they only see their own classe ── */}
      {!(user?.role === 'student' && user?.classe) && (
        <section className="bg-[#003580] text-white">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-blue-200 mr-2">Parcourir par classe :</span>
            {CLASSES.map(c => (
              <Link key={c} to={`/home?classe=${encodeURIComponent(c)}`}
                className="text-sm px-4 py-1.5 rounded-full bg-white/10 hover:bg-[#0ea5e9] transition-colors font-medium">
                {c}
              </Link>
            ))}
            <div className="w-px bg-white/20 mx-1 h-5" />
            <Link to="/home?serie=D"
              className="text-sm px-4 py-1.5 rounded-full bg-[#0ea5e9]/30 hover:bg-[#0ea5e9] border border-[#0ea5e9] transition-colors font-medium">
              Série D — Scientifique
            </Link>
            <Link to="/home?serie=A4"
              className="text-sm px-4 py-1.5 rounded-full bg-purple-500/30 hover:bg-purple-500 border border-purple-400 transition-colors font-medium">
              Série A4 — Littéraire
            </Link>
            <Link to="/catalog" className="ml-auto text-sm text-blue-200 hover:text-white flex items-center gap-1">
              Tous les cours <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Recent courses ────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Cours récents</h2>
          <Link to="/catalog" className="text-sm text-[#0ea5e9] hover:underline flex items-center gap-1">
            Voir tout <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Aucun cours publié pour l'instant</p>
            <Link to="/register" className="mt-4 inline-block text-[#0ea5e9] hover:underline text-sm">
              Devenir formateur →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {courses.map(c => <CourseCard key={c._id} course={c} />)}
          </div>
        )}
      </section>

      {/* ── CTA banner — visible only for guests ─────────────────────── */}
      {!user && (
        <section className="bg-[#003580] mt-4">
          <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8 items-center">
            <div className="text-white">
              <h3 className="text-xl font-bold mb-1">Vous êtes élève ?</h3>
              <p className="text-blue-200 text-sm">Créez un compte gratuit et accédez à tous les cours, bulletins et attestations sans rien payer.</p>
              <Link to="/register?role=student"
                className="mt-3 inline-block bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold px-6 py-2.5 rounded-sm text-sm transition-colors">
                S'inscrire gratuitement
              </Link>
            </div>
            <div className="text-white">
              <h3 className="text-xl font-bold mb-1">Vous êtes professeur ?</h3>
              <p className="text-blue-200 text-sm">Publiez vos cours, gérez vos évaluations trimestrielles et suivez vos élèves partout dans le monde.</p>
              <Link to="/register?role=instructor"
                className="mt-3 inline-block bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-6 py-2.5 rounded-sm text-sm transition-colors">
                Créer mon espace formateur
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-400 text-center py-4 text-xs mt-0">
        © 2026 EduMaster · Plateforme éducative du secondaire · Gratuit pour tous
      </footer>
    </div>
  );
}
