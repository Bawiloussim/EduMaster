import { useQuery } from '@tanstack/react-query';
import { Layers, GraduationCap, Users, BookOpen } from 'lucide-react';
import api from '../../../../services/api';
import Spinner from '../../../../components/ui/Spinner';
import { requiresSerie } from '../../../../constants/academic';

const ACCENTS = {
  teal: { badge: 'bg-teal-50 text-teal-600', pillActive: 'bg-teal-50 text-teal-700', header: 'from-teal-50/60' },
  blue: { badge: 'bg-blue-50 text-blue-600', pillActive: 'bg-blue-50 text-blue-700', header: 'from-blue-50/60' },
};

function CountPill({ value, color }) {
  if (!value) return <span className="text-sm text-gray-300">0</span>;
  return (
    <span className={`inline-flex min-w-[2.25rem] justify-center px-2.5 py-1 rounded-full text-sm font-bold ${ACCENTS[color].pillActive}`}>
      {value}
    </span>
  );
}

function HeaderStat({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, accent, rows, children }) {
  const totalStudents = rows.reduce((s, r) => s + r.studentsCount, 0);
  const totalCourses = rows.reduce((s, r) => s + r.coursesCount, 0);
  const a = ACCENTS[accent];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r ${a.header} to-white`}>
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${a.badge}`}>
            <Icon className="h-5.5 w-5.5" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        </div>
        <div className="flex items-center gap-6">
          <HeaderStat icon={Users} value={totalStudents} label="élèves" />
          <HeaderStat icon={BookOpen} value={totalCourses} label="cours" />
        </div>
      </div>
      {children}
    </div>
  );
}

function CollegeTable({ rows }) {
  return (
    <SectionCard icon={Layers} title="Collège" accent="teal" rows={rows}>
      <table className="w-full text-base">
        <thead>
          <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-6 py-3.5 text-left font-semibold">Classe</th>
            <th className="px-6 py-3.5 text-center font-semibold">Élèves</th>
            <th className="px-6 py-3.5 text-center font-semibold">Cours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((c) => (
            <tr key={c.classe} className="hover:bg-gray-50/60 transition-colors">
              <td className="px-6 py-4 font-semibold text-gray-900">{c.classe}</td>
              <td className="px-6 py-4 text-center"><CountPill value={c.studentsCount} color="teal" /></td>
              <td className="px-6 py-4 text-center"><CountPill value={c.coursesCount} color="teal" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

function LyceeTable({ rows }) {
  // Regroupe les lignes par classe pour fusionner visuellement la cellule "Classe" sur ses séries
  const byClasse = [];
  rows.forEach((r) => {
    const group = byClasse.find((g) => g.classe === r.classe);
    if (group) group.series.push(r);
    else byClasse.push({ classe: r.classe, series: [r] });
  });

  return (
    <SectionCard icon={GraduationCap} title="Lycée" accent="blue" rows={rows}>
      <table className="w-full text-base">
        <thead>
          <tr className="bg-gray-50/70 text-gray-500 text-xs uppercase tracking-wide">
            <th className="px-6 py-3.5 text-left font-semibold">Classe</th>
            <th className="px-6 py-3.5 text-left font-semibold">Série</th>
            <th className="px-6 py-3.5 text-center font-semibold">Élèves</th>
            <th className="px-6 py-3.5 text-center font-semibold">Cours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {byClasse.map((group) => (
            group.series.map((c, i) => (
              <tr key={`${c.classe}-${c.serie}`} className="hover:bg-gray-50/60 transition-colors">
                {i === 0 && (
                  <td className="px-6 py-4 font-semibold text-gray-900 align-top" rowSpan={group.series.length}>
                    {group.classe}
                  </td>
                )}
                <td className="px-6 py-4 text-gray-500 font-medium">{c.serie}</td>
                <td className="px-6 py-4 text-center"><CountPill value={c.studentsCount} color="blue" /></td>
                <td className="px-6 py-4 text-center"><CountPill value={c.coursesCount} color="blue" /></td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

export default function ClassesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => api.get('/admin/classes').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const college = (data || []).filter((c) => !requiresSerie(c.classe));
  const lycee = (data || []).filter((c) => requiresSerie(c.classe));

  return (
    <div className="space-y-8">
      <CollegeTable rows={college} />
      <LyceeTable rows={lycee} />
    </div>
  );
}
