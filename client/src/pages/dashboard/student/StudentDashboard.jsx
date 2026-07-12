import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BookOpen, Award, TrendingUp, Clock, Download, FileText,
  CheckCircle, BarChart2, GraduationCap, ClipboardList, Upload,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/useAuthStore';
import Spinner from '../../../components/ui/Spinner';
import ProgressBar from '../../../components/ui/ProgressBar';
import PageWrapper from '../../../components/layout/PageWrapper';

/* ── helpers ─────────────────────────────────────────────────────── */
const APPRECIATION_COLOR = {
  Honorable: 'text-purple-600 bg-purple-50',
  Excellent: 'text-emerald-600 bg-emerald-50',
  'Très bien': 'text-green-600 bg-green-50',
  Bien: 'text-blue-600 bg-blue-50',
  'Assez bien': 'text-sky-600 bg-sky-50',
  Passable: 'text-orange-600 bg-orange-50',
  Insuffisant: 'text-red-600 bg-red-50',
  'Très insuffisant': 'text-red-700 bg-red-100',
};

const getPdfUrl = (url) => {
  if (!url) return null;
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  return url.startsWith('/uploads/') ? `${API_BASE}${url}` : url;
};

const TYPE_LABELS = { interrogation: 'Interrogation', devoir: 'Devoir', composition: 'Composition' };
const TYPE_COLORS = {
  interrogation: 'bg-blue-50 text-blue-700 border-blue-200',
  devoir: 'bg-orange-50 text-orange-700 border-orange-200',
  composition: 'bg-red-50 text-red-700 border-red-200',
};

function fmt(v) {
  if (v === null || v === undefined) return '—';
  return typeof v === 'number' ? v.toFixed(2) : v;
}

function noteCell(val) {
  if (val === null || val === undefined) return <td className="px-3 py-2 text-center text-gray-300">—</td>;
  const n = parseFloat(val);
  const color = n >= 14 ? 'text-green-700' : n >= 10 ? 'text-gray-800' : 'text-red-600';
  return <td className={`px-3 py-2 text-center font-semibold ${color}`}>{n.toFixed(2)}</td>;
}

async function downloadBulletinPDF(trimestre) {
  try {
    const res = await api.get(`/evaluations/bulletin/${trimestre}/pdf/me`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulletin-trimestre-${trimestre}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error('Bulletin non disponible ou incomplet');
  }
}

async function downloadAttestation(certId, courseTitle) {
  try {
    const res = await api.get(`/certificates/${certId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `attestation-${courseTitle.replace(/\s+/g, '-')}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch {
    toast.error('Attestation non disponible');
  }
}

/* ── stat card ───────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
    </div>
  );
}

/* ── tab button ──────────────────────────────────────────────────── */
function Tab({ active, onClick, icon: Icon, children }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-[#003580] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
      }`}>
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

/* ── Bulletin tab ────────────────────────────────────────────────── */
function BulletinTab() {
  const [tri, setTri] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-bulletin', tri],
    queryFn: () => api.get(`/evaluations/bulletin/${tri}/me`).then(r => r.data.data),
  });

  const chartData = (data?.bulletin || []).map(b => ({
    name: b.course.subject,
    moyenne: b.moyenne ?? 0,
  }));

  const getEval = (evals, type, seq) => {
    const ev = evals.find(e => e.type === type && (seq === undefined || e.sequence === seq));
    if (!ev) return null;
    if (ev.grade?.absent) return 'Abs';
    if (ev.score20 === null) return null;
    return ev.score20;
  };

  return (
    <div>
      {/* Trimestre selector */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-gray-600">Trimestre :</span>
        {[1, 2, 3].map(t => (
          <button key={t} onClick={() => setTri(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
              tri === t ? 'border-[#003580] bg-[#003580] text-white' : 'border-gray-200 text-gray-600 hover:border-[#003580]'
            }`}>
            Trimestre {t}
          </button>
        ))}
        {data && (
          <button onClick={() => downloadBulletinPDF(tri)}
            className={`ml-auto flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
              data.isComplete
                ? 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!data.isComplete}
            title={!data.isComplete ? 'Complétez toutes les évaluations pour télécharger' : ''}>
            <Download className="h-4 w-4" />
            Télécharger PDF
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.bulletin?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune matière inscrite pour ce trimestre</p>
        </div>
      ) : (
        <>
          {/* Status banner */}
          {!data.isComplete && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-orange-700 text-sm">
              <Clock className="h-4 w-4 shrink-0" />
              Le bulletin sera disponible en PDF une fois que toutes les évaluations de toutes les matières seront notées (2 interrogations, 1 devoir, 1 composition).
            </div>
          )}

          {/* Grades table */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#003580] text-white text-xs">
                  <th className="px-4 py-3 text-left font-semibold">Matière</th>
                  <th className="px-3 py-3 text-center font-semibold">Interro 1</th>
                  <th className="px-3 py-3 text-center font-semibold">Interro 2</th>
                  <th className="px-3 py-3 text-center font-semibold">Devoir</th>
                  <th className="px-3 py-3 text-center font-semibold">Compos.</th>
                  <th className="px-3 py-3 text-center font-semibold">Moy./20</th>
                  <th className="px-3 py-3 text-center font-semibold">Appréciation</th>
                </tr>
              </thead>
              <tbody>
                {data.bulletin.map((subj, i) => {
                  const i1 = getEval(subj.evaluations, 'interrogation', 1);
                  const i2 = getEval(subj.evaluations, 'interrogation', 2);
                  const dv = getEval(subj.evaluations, 'devoir');
                  const co = getEval(subj.evaluations, 'composition');
                  return (
                    <tr key={subj.course._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{subj.course.subject}</td>
                      {[i1, i2, dv, co].map((v, vi) => (
                        <td key={vi} className="px-3 py-2 text-center">
                          {v === 'Abs' ? (
                            <span className="text-xs text-orange-500 font-bold">Abs</span>
                          ) : v === null ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className={`font-semibold ${parseFloat(v) >= 10 ? 'text-gray-800' : 'text-red-600'}`}>
                              {parseFloat(v).toFixed(2)}
                            </span>
                          )}
                        </td>
                      ))}
                      {noteCell(subj.moyenne)}
                      <td className="px-3 py-2 text-center">
                        {subj.appreciation ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${APPRECIATION_COLOR[subj.appreciation] || 'text-gray-600 bg-gray-100'}`}>
                            {subj.appreciation}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {/* General average row */}
                <tr className="bg-[#003580]/5 border-t-2 border-[#003580]/20 font-bold">
                  <td className="px-4 py-3 text-[#003580]">MOYENNE GÉNÉRALE</td>
                  <td colSpan={4} />
                  <td className="px-3 py-3 text-center text-[#003580] text-base">
                    {data.moyenneGenerale !== null ? data.moyenneGenerale.toFixed(2) : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {data.moyenneGenerale !== null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        APPRECIATION_COLOR[
                          data.moyenneGenerale >= 18 ? 'Excellent'
                          : data.moyenneGenerale >= 16 ? 'Très bien'
                          : data.moyenneGenerale >= 14 ? 'Bien'
                          : data.moyenneGenerale >= 12 ? 'Assez bien'
                          : data.moyenneGenerale >= 10 ? 'Passable' : 'Insuffisant'
                        ] || ''
                      }`}>
                        {data.moyenneGenerale >= 18 ? 'Excellent'
                          : data.moyenneGenerale >= 16 ? 'Très bien'
                          : data.moyenneGenerale >= 14 ? 'Bien'
                          : data.moyenneGenerale >= 12 ? 'Assez bien'
                          : data.moyenneGenerale >= 10 ? 'Passable' : 'Insuffisant'}
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-[#003580]" /> Moyennes par matière
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v.toFixed(2)}/20`, 'Moyenne']} />
                  <Bar dataKey="moyenne" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.moyenne >= 14 ? '#22c55e' : entry.moyenne >= 10 ? '#0ea5e9' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Envoi de copie pour une évaluation non signée ───────────────────── */
function SubmissionUpload({ evaluationId, submissionUrl, submissionName, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('submissionFile', file);
      await api.post(`/evaluations/${evaluationId}/submission`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Copie envoyée');
      setFile(null);
      onUploaded();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex items-center gap-2 mt-1 flex-wrap">
      {submissionUrl && (
        <a href={getPdfUrl(submissionUrl)} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          <FileText className="h-3 w-3" /> {submissionName || 'Ma copie'}
        </a>
      )}
      <label className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 cursor-pointer">
        <Upload className="h-3 w-3" />
        {file ? file.name.slice(0, 18) + '…' : submissionUrl ? 'Remplacer' : 'Envoyer ma copie'}
        <input ref={inputRef} type="file" accept="image/*,.pdf,application/pdf" className="hidden"
          onChange={e => setFile(e.target.files[0] || null)} />
      </label>
      {file && (
        <button onClick={upload} disabled={uploading}
          className="text-xs font-medium text-white bg-[#003580] hover:bg-[#002a66] disabled:opacity-50 rounded-lg px-2 py-1">
          {uploading ? '…' : 'Envoyer'}
        </button>
      )}
    </div>
  );
}

/* ── Évaluations tab (interrogations / devoirs / compositions) ──────── */
function EvaluationsTab() {
  const [tri, setTri] = useState(1);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-evaluations', tri],
    queryFn: () => api.get('/evaluations/me', { params: { trimestre: tri } }).then(r => r.data.data),
  });

  const bySubject = {};
  (data || []).forEach((ev) => {
    const subject = ev.course?.subject || 'Autre';
    (bySubject[subject] ||= []).push(ev);
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Trimestre :</span>
        {[1, 2, 3].map((t) => (
          <button key={t} onClick={() => setTri(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold border-2 transition-colors ${
              tri === t ? 'border-[#003580] bg-[#003580] text-white' : 'border-gray-200 text-gray-600 hover:border-[#003580]'
            }`}>
            Trimestre {t}
          </button>
        ))}
        {user?.classe && (
          <span className="ml-auto text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
            {user.classe}{user.serie ? ` · Série ${user.serie}` : ''}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !Object.keys(bySubject).length ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Aucune interrogation, devoir ou composition pour ce trimestre</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(bySubject).map(([subject, evals]) => (
            <div key={subject} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 font-semibold text-sm text-gray-800">{subject}</div>
              <div className="divide-y divide-gray-50">
                {evals.map((ev) => {
                  const score20 = ev.grade && !ev.grade.absent && ev.grade.score !== null
                    ? (ev.grade.score / ev.maxScore) * 20 : null;
                  return (
                    <div key={ev._id} className="px-4 py-3 flex items-center gap-3">
                      <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${TYPE_COLORS[ev.type]}`}>
                        {TYPE_LABELS[ev.type]}{ev.type === 'interrogation' ? ` ${ev.sequence}` : ''}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{ev.title || TYPE_LABELS[ev.type]}</p>
                        {ev.date && (
                          <p className="text-xs text-gray-400">
                            {new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        )}
                        {!ev.signed && (
                          <SubmissionUpload
                            evaluationId={ev._id}
                            submissionUrl={ev.submissionUrl}
                            submissionName={ev.submissionName}
                            onUploaded={() => qc.invalidateQueries(['my-evaluations', tri])}
                          />
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {ev.grade?.absent ? (
                          <span className="text-xs font-bold text-orange-500">Absent</span>
                        ) : score20 !== null ? (
                          <span className={`text-sm font-bold ${score20 >= 10 ? 'text-gray-800' : 'text-red-600'}`}>
                            {score20.toFixed(2)}/20
                          </span>
                        ) : ev.pendingSignature ? (
                          <span className="text-xs font-medium text-orange-400">En attente de validation</span>
                        ) : (
                          <span className="text-xs text-gray-300">Pas encore noté</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Attestations tab ────────────────────────────────────────────── */
function AttestationsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: () => api.get('/certificates/me').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;

  const completions = (data || []).filter(c => c.type === 'completion');

  if (!completions.length) return (
    <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
      <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
      <p>Aucune attestation pour l'instant</p>
      <p className="text-xs mt-1">Terminez un cours pour obtenir votre attestation gratuitement</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {completions.map(c => (
        <div key={c._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{c.course?.title}</p>
            <p className="text-xs text-gray-400">
              {c.course?.classe}{c.course?.serie ? ` — Série ${c.course.serie}` : ''}
              {' · '}Délivrée le {new Date(c.issuedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full font-medium">
              <CheckCircle className="h-3 w-3" /> Cours complété
            </span>
            <button onClick={() => downloadAttestation(c._id, c.course?.title)}
              className="flex items-center gap-1.5 bg-[#003580] hover:bg-[#002060] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main dashboard ──────────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('courses');

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-student'],
    queryFn: () => api.get('/dashboard/student').then(r => r.data.data),
  });

  if (isLoading) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <PageWrapper>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.name} 👋</h1>
          <p className="text-gray-500 mt-1">Suivez votre progression et accédez à vos ressources</p>
        </div>
        {user?.classe && (
          <span className="text-sm font-bold px-4 py-2 rounded-full bg-[#003580] text-white">
            {user.classe}{user.serie ? ` · Série ${user.serie}` : ''}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={BookOpen} label="Cours suivis" value={data?.enrollmentsCount || 0} color="blue" />
        <StatCard icon={TrendingUp} label="Cours complétés" value={data?.completedCourses || 0} color="green" />
        <StatCard icon={Award} label="Attestations" value={data?.certificatesCount || 0} color="purple" />
        <StatCard icon={Clock} label="Progression moy." value={`${data?.avgProgress || 0}%`} color="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Tab active={tab === 'courses'} onClick={() => setTab('courses')} icon={BookOpen}>Mes cours</Tab>
        <Tab active={tab === 'evaluations'} onClick={() => setTab('evaluations')} icon={ClipboardList}>Évaluations</Tab>
        <Tab active={tab === 'bulletin'} onClick={() => setTab('bulletin')} icon={FileText}>Bulletin</Tab>
        <Tab active={tab === 'attestations'} onClick={() => setTab('attestations')} icon={GraduationCap}>Attestations</Tab>
      </div>

      {/* Courses tab */}
      {tab === 'courses' && (
        <div>
          {!data?.enrollments?.length ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 mb-4">Vous n'êtes inscrit à aucun cours</p>
              <Link to="/catalog" className="text-[#0ea5e9] text-sm font-medium hover:underline">Découvrir le catalogue →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {data.enrollments.map(e => (
                <div key={e._id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                  <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-[#003580] to-[#0ea5e9] overflow-hidden shrink-0 flex items-center justify-center">
                    {e.course?.coverImage
                      ? <img src={e.course.coverImage} alt="" className="w-full h-full object-cover" />
                      : <BookOpen className="h-6 w-6 text-white/60" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={`/courses/${e.course?._id}/learn`}
                      className="font-semibold text-gray-900 hover:text-[#003580] text-sm truncate block">
                      {e.course?.title}
                    </Link>
                    <div className="text-xs text-gray-400 mb-1.5">
                      {e.course?.classe}{e.course?.serie ? ` · Série ${e.course.serie}` : ''}
                    </div>
                    <ProgressBar value={e.progress} showLabel />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {e.progress === 100 && (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <CheckCircle className="h-3 w-3" /> Complété
                      </span>
                    )}
                    <Link to={`/courses/${e.course?._id}/learn`}
                      className="text-xs bg-[#003580] hover:bg-[#002060] text-white font-bold px-3 py-1.5 rounded-lg transition-colors">
                      {e.progress > 0 ? 'Continuer' : 'Commencer'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'evaluations' && <EvaluationsTab />}
      {tab === 'bulletin' && <BulletinTab />}
      {tab === 'attestations' && <AttestationsTab />}
    </PageWrapper>
  );
}
