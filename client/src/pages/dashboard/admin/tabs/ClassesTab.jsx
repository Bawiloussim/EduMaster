import { useQuery } from '@tanstack/react-query';
import { Layers, GraduationCap } from 'lucide-react';
import api from '../../../../services/api';
import Spinner from '../../../../components/ui/Spinner';
import { requiresSerie } from '../../../../constants/academic';

function SectionTotal({ label, value }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-sm font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
}

function CollegeTable({ rows }) {
  const totalStudents = rows.reduce((s, r) => s + r.studentsCount, 0);
  const totalCourses = rows.reduce((s, r) => s + r.coursesCount, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Layers className="h-4 w-4 text-teal-600" /> Collège
        </div>
        <div className="flex items-center gap-4">
          <SectionTotal label="élèves" value={totalStudents} />
          <SectionTotal label="cours" value={totalCourses} />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
            <th className="px-4 py-3 text-left font-semibold">Classe</th>
            <th className="px-4 py-3 text-center font-semibold">Élèves</th>
            <th className="px-4 py-3 text-center font-semibold">Cours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((c) => (
            <tr key={c.classe}>
              <td className="px-4 py-3 font-medium text-gray-900">{c.classe}</td>
              <td className="px-4 py-3 text-center">{c.studentsCount}</td>
              <td className="px-4 py-3 text-center">{c.coursesCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LyceeTable({ rows }) {
  const totalStudents = rows.reduce((s, r) => s + r.studentsCount, 0);
  const totalCourses = rows.reduce((s, r) => s + r.coursesCount, 0);

  // Regroupe les lignes par classe pour fusionner visuellement la cellule "Classe" sur ses séries
  const byClasse = [];
  rows.forEach((r) => {
    const group = byClasse.find((g) => g.classe === r.classe);
    if (group) group.series.push(r);
    else byClasse.push({ classe: r.classe, series: [r] });
  });

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 bg-gray-50/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <GraduationCap className="h-4 w-4 text-blue-600" /> Lycée
        </div>
        <div className="flex items-center gap-4">
          <SectionTotal label="élèves" value={totalStudents} />
          <SectionTotal label="cours" value={totalCourses} />
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
            <th className="px-4 py-3 text-left font-semibold">Classe</th>
            <th className="px-4 py-3 text-left font-semibold">Série</th>
            <th className="px-4 py-3 text-center font-semibold">Élèves</th>
            <th className="px-4 py-3 text-center font-semibold">Cours</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {byClasse.map((group) => (
            group.series.map((c, i) => (
              <tr key={`${c.classe}-${c.serie}`}>
                {i === 0 && (
                  <td className="px-4 py-3 font-medium text-gray-900 align-top" rowSpan={group.series.length}>
                    {group.classe}
                  </td>
                )}
                <td className="px-4 py-3 text-gray-500">{c.serie}</td>
                <td className="px-4 py-3 text-center">{c.studentsCount}</td>
                <td className="px-4 py-3 text-center">{c.coursesCount}</td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <CollegeTable rows={college} />
      <LyceeTable rows={lycee} />
    </div>
  );
}
