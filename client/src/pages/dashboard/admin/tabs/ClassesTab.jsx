import { useQuery } from '@tanstack/react-query';
import api from '../../../../services/api';
import Spinner from '../../../../components/ui/Spinner';

export default function ClassesTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => api.get('/admin/classes').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
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
          {data?.map((c) => (
            <tr key={`${c.classe}-${c.serie}`}>
              <td className="px-4 py-3 font-medium text-gray-900">{c.classe}</td>
              <td className="px-4 py-3 text-gray-500">{c.serie || '—'}</td>
              <td className="px-4 py-3 text-center">{c.studentsCount}</td>
              <td className="px-4 py-3 text-center">{c.coursesCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
