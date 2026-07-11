import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Medal } from 'lucide-react';
import api from '../../../../services/api';
import Spinner from '../../../../components/ui/Spinner';
import { CLASSES, SERIES } from '../../../../constants/academic';

const selectClass = 'text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white';

const MEDAL_COLORS = { 1: 'text-yellow-500', 2: 'text-gray-400', 3: 'text-orange-600' };

export default function PalmaresTab() {
  const [classe, setClasse] = useState(CLASSES[0]);
  const [serie, setSerie] = useState(SERIES[0]);
  const [trimestre, setTrimestre] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-palmares', classe, serie, trimestre],
    queryFn: () => api.get('/admin/palmares', { params: { classe, serie, trimestre } }).then(r => r.data.data),
    enabled: !!classe && !!serie,
  });

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6">
        <select className={selectClass} value={classe} onChange={(e) => setClasse(e.target.value)}>
          {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={serie} onChange={(e) => setSerie(e.target.value)}>
          {SERIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectClass} value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value))}>
          <option value={1}>Trimestre 1</option>
          <option value={2}>Trimestre 2</option>
          <option value={3}>Trimestre 3</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3 text-left font-semibold">Rang</th>
                <th className="px-4 py-3 text-left font-semibold">Élève</th>
                <th className="px-4 py-3 text-center font-semibold">Moyenne générale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.ranking?.map((r) => (
                <tr key={r.student._id}>
                  <td className="px-4 py-3">
                    {r.rang && r.rang <= 3 ? (
                      <span className={`inline-flex items-center gap-1 font-semibold ${MEDAL_COLORS[r.rang]}`}>
                        <Medal className="h-4 w-4" /> {r.rang}
                      </span>
                    ) : (
                      <span className="text-gray-500">{r.rang ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.student.name}</div>
                    <div className="text-xs text-gray-400">{r.student.email}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-900">
                    {r.moyenneGenerale !== null ? `${r.moyenneGenerale}/20` : '—'}
                  </td>
                </tr>
              ))}
              {data?.ranking?.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">Aucun élève dans cette classe</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
