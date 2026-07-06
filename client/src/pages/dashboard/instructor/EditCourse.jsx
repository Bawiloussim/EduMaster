import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Plus, Trash2, Save, ChevronLeft, BookOpen, HelpCircle,
  ChevronDown, ChevronUp, Video, FileText, AlignLeft,
  ClipboardList, BarChart2, Upload, Check, X, Eye, Pencil
} from 'lucide-react';
import api from '../../../services/api';
import Spinner from '../../../components/ui/Spinner';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Modal from '../../../components/ui/Modal';
import PageWrapper from '../../../components/layout/PageWrapper';
import { CLASSES, SERIES, SUBJECTS_BY_SERIE } from '../../../utils/schoolData';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
const pdfHref = (url) => url?.startsWith('/uploads/') ? `${API_BASE}${url}` : url;

const TABS = [
  { id: 'lessons', label: 'Leçons & Exercices', icon: BookOpen },
  { id: 'evals', label: 'Évaluations', icon: ClipboardList },
  { id: 'bulletin', label: 'Bulletin', icon: BarChart2 },
];

// ─── Lesson row ───────────────────────────────────────────────────────────────
function LessonRow({ lesson, courseId, onDelete, onSaved }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('content'); // 'content' | 'exercises'
  const [form, setForm] = useState({ videoUrl: lesson.videoUrl || '', pdfUrl: lesson.pdfUrl || '', content: lesson.content || '', isFreePreview: lesson.isFreePreview || false });
  const [pdfFile, setPdfFile] = useState(null);
  const qc = useQueryClient();
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (pdfFile) {
        const fd = new FormData();
        fd.append('pdfFile', pdfFile);
        fd.append('videoUrl', form.videoUrl);
        fd.append('content', form.content);
        fd.append('isFreePreview', form.isFreePreview);
        return api.put(`/lessons/${lesson._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      return api.put(`/lessons/${lesson._id}`, form);
    },
    onSuccess: (res) => {
      toast.success('Leçon sauvegardée');
      if (res.data?.data?.pdfUrl) set('pdfUrl', res.data.data.pdfUrl);
      setPdfFile(null);
      onSaved();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const icons = [form.videoUrl && <Video key="v" className="h-3 w-3 text-blue-500" />, (form.pdfUrl || pdfFile) && <FileText key="p" className="h-3 w-3 text-red-400" />, form.content && <AlignLeft key="t" className="h-3 w-3 text-green-500" />].filter(Boolean);

  return (
    <div className={`rounded-xl border transition-colors ${open ? 'border-blue-200 bg-blue-50/20' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-1 shrink-0">{icons.length ? icons : <div className="h-3 w-3 rounded-full bg-gray-200" />}</div>
        <span className="text-sm font-medium text-gray-800 flex-1 truncate">{lesson.title}</span>
        {form.isFreePreview && <span className="text-xs text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded">Aperçu</span>}
        <span className="text-xs text-blue-500">{open ? 'Fermer' : 'Éditer'}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>

      {open && (
        <div className="border-t border-blue-100">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[{ id: 'content', label: 'Contenu' }, { id: 'exercises', label: 'Exercices' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'content' && (
            <div className="p-4 space-y-4">
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide"><Video className="h-3.5 w-3.5 text-blue-500" /> Vidéo</label>
                <Input value={form.videoUrl} onChange={e => set('videoUrl', e.target.value)} placeholder="URL YouTube, Vimeo ou lien direct (.mp4)…" />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide"><FileText className="h-3.5 w-3.5 text-red-400" /> PDF / Document</label>
                {form.pdfUrl && !pdfFile && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-xs text-red-700 flex-1">PDF enregistré</span>
                    <a href={pdfHref(form.pdfUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Voir</a>
                    <button onClick={() => set('pdfUrl', '')} className="text-gray-400 hover:text-red-500">✕</button>
                  </div>
                )}
                {pdfFile && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <span className="text-xs text-orange-700 flex-1 truncate">{pdfFile.name}</span>
                    <span className="text-xs text-orange-400">{(pdfFile.size / 1024 / 1024).toFixed(1)} Mo</span>
                    <button onClick={() => setPdfFile(null)} className="text-gray-400 hover:text-red-500">✕</button>
                  </div>
                )}
                {!pdfFile && (
                  <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-red-300 hover:text-red-500 cursor-pointer transition-colors">
                    <FileText className="h-4 w-4" />
                    {form.pdfUrl ? 'Remplacer le PDF' : 'Importer un fichier PDF'}
                    <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => { if (e.target.files[0]) setPdfFile(e.target.files[0]); }} />
                  </label>
                )}
              </div>

              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide"><AlignLeft className="h-3.5 w-3.5 text-green-500" /> Cours écrit</label>
                <textarea rows={5} value={form.content} onChange={e => set('content', e.target.value)} placeholder="Rédigez le contenu de la leçon ici…" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.isFreePreview} onChange={e => set('isFreePreview', e.target.checked)} className="accent-blue-600" />
                  Aperçu gratuit
                </label>
                <Button size="sm" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}><Save className="h-3.5 w-3.5" /> Sauvegarder</Button>
              </div>
            </div>
          )}

          {tab === 'exercises' && <ExercisesTab lessonId={lesson._id} courseId={courseId} />}
        </div>
      )}
    </div>
  );
}

// ─── Exercises tab ────────────────────────────────────────────────────────────
function ExercisesTab({ lessonId, courseId }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEx, setNewEx] = useState({ statement: '', type: 'open', options: ['', '', '', ''], correctOption: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['exercises', lessonId],
    queryFn: () => api.get(`/exercises/lessons/${lessonId}`).then(r => r.data.data),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post(`/exercises/lessons/${lessonId}`, {
      ...newEx,
      options: newEx.type === 'qcm' ? newEx.options.filter(o => o.trim()) : [],
    }),
    onSuccess: () => { toast.success('Exercice ajouté'); qc.invalidateQueries(['exercises', lessonId]); setAdding(false); setNewEx({ statement: '', type: 'open', options: ['', '', '', ''], correctOption: 0 }); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => api.put(`/exercises/${id}`, body),
    onSuccess: () => { toast.success('Exercice modifié'); qc.invalidateQueries(['exercises', lessonId]); setEditingId(null); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/exercises/${id}`),
    onSuccess: () => { toast.success('Exercice supprimé'); qc.invalidateQueries(['exercises', lessonId]); },
  });

  if (isLoading) return <div className="p-4"><Spinner /></div>;

  return (
    <div className="p-4 space-y-3">
      {data?.length === 0 && !adding && <p className="text-xs text-gray-400 text-center py-4">Aucun exercice — ajoutez-en un ci-dessous</p>}

      {data?.map((ex, i) => (
        editingId === ex._id ? (
          <EditExerciseForm key={ex._id} exercise={ex}
            saving={updateMutation.isPending}
            onCancel={() => setEditingId(null)}
            onSave={(body) => updateMutation.mutate({ id: ex._id, body })} />
        ) : (
          <div key={ex._id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <span className="text-xs font-bold text-gray-400 mr-2">Q{i + 1}</span>
                <span className="text-sm text-gray-800">{ex.statement}</span>
                {ex.type === 'qcm' && (
                  <div className="mt-2 space-y-1">
                    {ex.options.map((opt, oi) => (
                      <div key={oi} className={`text-xs px-2 py-1 rounded ${oi === ex.correctOption ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-500'}`}>
                        {oi === ex.correctOption ? '✓ ' : '◦ '}{opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-xs px-1.5 py-0.5 rounded ${ex.type === 'qcm' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>{ex.type === 'qcm' ? 'QCM' : 'Ouvert'}</span>
                <button onClick={() => setEditingId(ex._id)} className="p-1 text-blue-400 hover:text-blue-600"><Pencil className="h-3 w-3" /></button>
                <button onClick={() => window.confirm('Supprimer ?') && deleteMutation.mutate(ex._id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          </div>
        )
      ))}

      {adding && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <ExerciseFormFields value={newEx} onChange={setNewEx} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setAdding(false)}>Annuler</Button>
            <Button size="sm" disabled={!newEx.statement.trim()} loading={addMutation.isPending} onClick={() => addMutation.mutate()}>Ajouter</Button>
          </div>
        </div>
      )}

      {!adding && (
        <button onClick={() => setAdding(true)} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-500 hover:border-blue-300 hover:text-blue-500 transition-colors">
          + Ajouter un exercice
        </button>
      )}
    </div>
  );
}

// Shared editable fields for an exercise (statement, type, QCM options)
function ExerciseFormFields({ value, onChange }) {
  const set = (k, v) => onChange(f => ({ ...f, [k]: v }));
  return (
    <>
      <div className="flex gap-2">
        <select value={value.type} onChange={e => set('type', e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="open">Question ouverte</option>
          <option value="qcm">QCM</option>
        </select>
      </div>
      <textarea rows={3} value={value.statement} onChange={e => set('statement', e.target.value)}
        placeholder="Énoncé de l'exercice…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      {value.type === 'qcm' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Propositions (cochez la bonne réponse) :</p>
          {value.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={value.correctOption === i} onChange={() => set('correctOption', i)} className="accent-green-600" />
              <input value={opt} onChange={e => { const o = [...value.options]; o[i] = e.target.value; set('options', o); }}
                placeholder={`Option ${i + 1}…`}
                className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function EditExerciseForm({ exercise, onSave, onCancel, saving }) {
  const [ex, setEx] = useState({
    statement: exercise.statement || '',
    type: exercise.type || 'open',
    options: exercise.type === 'qcm' && exercise.options?.length ? exercise.options : ['', '', '', ''],
    correctOption: exercise.correctOption ?? 0,
  });

  return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
      <ExerciseFormFields value={ex} onChange={setEx} />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={onCancel}>Annuler</Button>
        <Button size="sm" disabled={!ex.statement.trim()} loading={saving}
          onClick={() => onSave({ ...ex, options: ex.type === 'qcm' ? ex.options.filter(o => o.trim()) : [] })}>
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

// ─── Evaluations tab ──────────────────────────────────────────────────────────
const EVAL_TYPES = [
  { type: 'interrogation', seq: 1, label: 'Interrogation 1', coeff: 1, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { type: 'interrogation', seq: 2, label: 'Interrogation 2', coeff: 1, color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { type: 'devoir', seq: 1, label: 'Devoir', coeff: 2, color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { type: 'composition', seq: 1, label: 'Composition', coeff: 3, color: 'bg-orange-50 border-orange-200 text-orange-700' },
];

function EvaluationsTab({ courseId }) {
  const qc = useQueryClient();
  const [trimestre, setTrimestre] = useState(1);
  const [gradesModal, setGradesModal] = useState(null); // evaluationId

  const { data: evals, isLoading } = useQuery({
    queryKey: ['evaluations', courseId],
    queryFn: () => api.get(`/evaluations/course/${courseId}`).then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.post(`/evaluations/course/${courseId}`, body),
    onSuccess: () => { toast.success('Évaluation créée'); qc.invalidateQueries(['evaluations', courseId]); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/evaluations/${id}`),
    onSuccess: () => { toast.success('Évaluation supprimée'); qc.invalidateQueries(['evaluations', courseId]); },
  });

  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>;

  const triEvals = evals?.filter(e => e.trimestre === trimestre) || [];
  const getEval = (type, seq) => triEvals.find(e => e.type === type && e.sequence === seq);

  return (
    <div className="space-y-4">
      {/* Trimestre selector */}
      <div className="flex gap-2">
        {[1, 2, 3].map(t => (
          <button key={t} onClick={() => setTrimestre(t)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${trimestre === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Trimestre {t}
          </button>
        ))}
      </div>

      {/* Evaluation slots */}
      <div className="space-y-3">
        {EVAL_TYPES.map(({ type, seq, label, coeff, color }) => {
          const ev = getEval(type, seq);
          return (
            <div key={`${type}-${seq}`} className={`rounded-xl border p-4 ${color}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-semibold text-sm">{label}</span>
                  <span className="ml-2 text-xs opacity-70">Coefficient {coeff} — /20</span>
                </div>
                {ev ? (
                  <div className="flex gap-2">
                    <button onClick={() => setGradesModal(ev._id)} className="text-xs px-2 py-1 bg-white/70 rounded-lg hover:bg-white transition-colors">Notes</button>
                    <button onClick={() => window.confirm('Supprimer ?') && deleteMutation.mutate(ev._id)} className="text-xs px-2 py-1 text-red-600 bg-white/70 rounded-lg hover:bg-white transition-colors">✕</button>
                  </div>
                ) : (
                  <button onClick={() => createMutation.mutate({ trimestre, type, sequence: seq, maxScore: 20 })}
                    className="text-xs px-3 py-1.5 bg-white/80 rounded-lg hover:bg-white transition-colors font-medium">
                    + Créer
                  </button>
                )}
              </div>

              {ev && (
                <div className="space-y-2 mt-3">
                  <div className="flex items-center gap-2 text-xs">
                    {ev.isGraded ? <span className="flex items-center gap-1 text-green-700"><Check className="h-3 w-3" /> Notes saisies</span>
                      : <span className="opacity-60">Notes non saisies</span>}
                    {ev.correctionUrl
                      ? <a href={pdfHref(ev.correctionUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-current hover:underline ml-auto"><Eye className="h-3 w-3" /> Voir corrigé</a>
                      : <span className="opacity-60 ml-auto">Pas de corrigé</span>}
                  </div>
                  {/* Upload correction */}
                  <CorrectionUpload evaluationId={ev._id} onUploaded={() => qc.invalidateQueries(['evaluations', courseId])} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {gradesModal && <GradesModal evaluationId={gradesModal} onClose={() => setGradesModal(null)} onSaved={() => qc.invalidateQueries(['evaluations', courseId])} />}
    </div>
  );
}

function CorrectionUpload({ evaluationId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('correctionFile', file);
      await api.post(`/evaluations/${evaluationId}/correction`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Corrigé uploadé');
      setFile(null);
      onUploaded();
    } catch (e) { toast.error(e.response?.data?.message || 'Erreur'); }
    finally { setUploading(false); }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="flex items-center gap-1.5 text-xs px-2 py-1.5 bg-white/80 rounded-lg cursor-pointer hover:bg-white transition-colors border border-current/20">
        <Upload className="h-3 w-3" />
        {file ? file.name.slice(0, 20) + '…' : 'Uploader le corrigé (PDF)'}
        <input ref={inputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => setFile(e.target.files[0])} />
      </label>
      {file && (
        <Button size="sm" loading={uploading} onClick={upload} className="text-xs py-1 px-2">Envoyer</Button>
      )}
    </div>
  );
}

function GradesModal({ evaluationId, onClose, onSaved }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['grades', evaluationId],
    queryFn: () => api.get(`/evaluations/${evaluationId}/grades`).then(r => r.data),
  });

  const [scores, setScores] = useState({});
  const setScore = (studentId, val) => setScores(s => ({ ...s, [studentId]: val }));

  const saveMutation = useMutation({
    mutationFn: () => api.post(`/evaluations/${evaluationId}/grades`, {
      grades: (data?.data || []).map(row => ({
        studentId: row.student._id,
        score: scores[row.student._id] ?? row.grade?.score ?? '',
        absent: scores[row.student._id] === 'ABS' || row.grade?.absent,
        comment: '',
      })),
    }),
    onSuccess: () => { toast.success('Notes sauvegardées'); qc.invalidateQueries(['grades', evaluationId]); onSaved(); onClose(); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  return (
    <Modal open onClose={onClose} title="Saisie des notes" size="lg">
      {isLoading ? <Spinner /> : (
        <div className="space-y-4">
          <p className="text-xs text-gray-500">Note /20. Saisissez "ABS" pour un élève absent.</p>
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
            {data?.data?.map(row => (
              <div key={row.student._id} className="flex items-center gap-3 py-2 border-b border-gray-50">
                <div className="h-7 w-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                  {row.student.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm flex-1 truncate">{row.student.name}</span>
                <input
                  defaultValue={row.grade?.absent ? 'ABS' : (row.grade?.score ?? '')}
                  onChange={e => setScore(row.student._id, e.target.value)}
                  placeholder="—"
                  className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
            {data?.data?.length === 0 && <p className="text-center text-gray-400 py-4">Aucun élève inscrit</p>}
          </div>
          <Button className="w-full" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Enregistrer les notes
          </Button>
        </div>
      )}
    </Modal>
  );
}

// ─── Bulletin tab ─────────────────────────────────────────────────────────────
function BulletinTab({ courseId }) {
  const [trimestre, setTrimestre] = useState(1);
  const [studentId, setStudentId] = useState('');

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments-list', courseId],
    queryFn: () => api.get(`/enrollments?course=${courseId}`).then(r => r.data.data).catch(() => []),
  });

  const { data: bulletin, isLoading, refetch } = useQuery({
    queryKey: ['bulletin', studentId, trimestre],
    queryFn: () => api.get(`/evaluations/bulletin/${trimestre}/student/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  });

  const courseData = bulletin?.bulletin?.find(b => b.course._id === courseId);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3].map(t => (
          <button key={t} onClick={() => setTrimestre(t)}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${trimestre === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            Trimestre {t}
          </button>
        ))}
      </div>

      {enrollments?.length > 0 && (
        <select value={studentId} onChange={e => setStudentId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">-- Sélectionner un élève --</option>
          {enrollments.map(e => <option key={e.student?._id} value={e.student?._id}>{e.student?.name}</option>)}
        </select>
      )}

      {isLoading && <Spinner />}

      {courseData && (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <span className="font-semibold text-gray-900">{courseData.course.subject}</span>
            <span className="text-gray-400 text-sm ml-2">— Trimestre {trimestre}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {courseData.evaluations.map(ev => (
              <div key={ev._id} className="flex items-center px-4 py-3 text-sm">
                <span className="flex-1 text-gray-700">
                  {ev.type === 'interrogation' ? `Interrogation ${ev.sequence}` : ev.type === 'devoir' ? 'Devoir' : 'Composition'}
                  <span className="text-gray-400 text-xs ml-1">(coeff {ev.coefficient})</span>
                </span>
                {ev.grade?.absent
                  ? <span className="text-orange-600 font-medium">ABS</span>
                  : ev.grade?.score !== null && ev.grade?.score !== undefined
                    ? <span className={`font-bold ${ev.score20 >= 10 ? 'text-green-600' : 'text-red-500'}`}>{ev.grade.score}/{ev._maxScore || 20}</span>
                    : <span className="text-gray-300">—</span>}
              </div>
            ))}
          </div>
          <div className={`flex items-center justify-between px-4 py-3 border-t-2 font-bold ${courseData.moyenne >= 10 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <span className="text-gray-800">Moyenne</span>
            <div className="text-right">
              <span className={`text-lg ${courseData.moyenne >= 10 ? 'text-green-700' : 'text-red-600'}`}>{courseData.moyenne ?? '—'}/20</span>
              {courseData.appreciation && <div className="text-xs text-gray-500 font-normal">{courseData.appreciation}</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EditCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('lessons');
  const [lessonModal, setLessonModal] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');

  const { data: course, isLoading } = useQuery({
    queryKey: ['course-edit', id],
    queryFn: () => api.get(`/courses/${id}`).then(r => r.data.data),
  });

  const [form, setForm] = useState(null);
  if (!form && course) {
    setForm({ subject: course.subject || course.title || '', description: course.description || '', classe: course.classe || 'Seconde', serie: course.serie || 'D' });
  }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const subjects = SUBJECTS_BY_SERIE[form?.serie || 'D'] || [];

  const saveMutation = useMutation({
    mutationFn: () => api.put(`/courses/${id}`, { ...form, title: form.subject }),
    onSuccess: () => { toast.success('Cours sauvegardé'); qc.invalidateQueries(['course-edit', id]); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });

  const addModuleMutation = useMutation({
    mutationFn: () => api.post(`/courses/${id}/modules`, { title: moduleTitle }),
    onSuccess: () => { toast.success('Module ajouté'); setModuleTitle(''); qc.invalidateQueries(['course-edit', id]); },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId) => api.delete(`/lessons/${lessonId}`),
    onSuccess: () => { toast.success('Leçon supprimée'); qc.invalidateQueries(['course-edit', id]); },
  });

  const addLessonMutation = useMutation({
    mutationFn: (data) => api.post(`/courses/${id}/lessons`, data),
    onSuccess: () => { qc.invalidateQueries(['course-edit', id]); },
  });

  if (isLoading || !form) return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>;

  const lessons = (course?.lessons || []).sort((a, b) => a.order - b.order);
  const modules = course?.modules || [];
  const invalidate = () => qc.invalidateQueries(['course-edit', id]);

  return (
    <PageWrapper>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/instructor')} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{course.subject || course.title}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{course.classe}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.serie === 'D' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>Série {course.serie}</span>
          </div>
        </div>
        <Button variant="secondary" loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}><Save className="h-4 w-4" /> Sauvegarder</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar — course info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Informations</h2>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Classe</label>
              <div className="flex gap-1">
                {CLASSES.map(c => <button key={c} type="button" onClick={() => set('classe', c)}
                  className={`flex-1 py-1 rounded-lg border text-xs font-medium transition-colors ${form.classe === c ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>{c}</button>)}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Série</label>
              <div className="flex gap-1">
                {SERIES.map(s => <button key={s} type="button" onClick={() => set('serie', s)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.serie === s ? s === 'D' ? 'border-blue-600 bg-blue-600 text-white' : 'border-purple-600 bg-purple-600 text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>Série {s}</button>)}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Matière</label>
              <select value={form.subject} onChange={e => set('subject', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 mb-1">
                <option value="">-- Choisir --</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <Input placeholder="Autre matière" value={form.subject} onChange={e => set('subject', e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Description</label>
              <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
        </div>

        {/* Right content area */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <t.icon className="h-4 w-4" />
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'lessons' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{lessons.length} leçon{lessons.length > 1 ? 's' : ''} — cliquez pour éditer le contenu et les exercices</p>
                <Button size="sm" onClick={() => setLessonModal(true)}><Plus className="h-4 w-4" /> Ajouter</Button>
              </div>
              <div className="flex gap-2 mb-3">
                <Input value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} placeholder="Titre du nouveau module…" className="flex-1" />
                <Button size="sm" variant="secondary" disabled={!moduleTitle.trim()} loading={addModuleMutation.isPending} onClick={() => addModuleMutation.mutate()}>+ Module</Button>
              </div>
              {lessons.length === 0
                ? <div className="text-center py-10 text-gray-400"><BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Aucune leçon</p></div>
                : lessons.map(l => <LessonRow key={l._id} lesson={l} courseId={id} onSaved={invalidate} onDelete={() => window.confirm('Supprimer ?') && deleteLessonMutation.mutate(l._id)} />)
              }
            </div>
          )}

          {activeTab === 'evals' && <EvaluationsTab courseId={id} />}
          {activeTab === 'bulletin' && <BulletinTab courseId={id} />}
        </div>
      </div>

      {/* Add lesson modal */}
      {lessonModal && (
        <Modal open onClose={() => setLessonModal(false)} title="Nouvelle leçon">
          <AddLessonInline courseId={id} modules={modules} onSuccess={() => { invalidate(); setLessonModal(false); }} />
        </Modal>
      )}
    </PageWrapper>
  );
}

function AddLessonInline({ courseId, modules, onSuccess }) {
  const [title, setTitle] = useState('');
  const [moduleId, setModuleId] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.post(`/courses/${courseId}/lessons`, { title, moduleId: moduleId || undefined }),
    onSuccess: () => { toast.success('Leçon créée'); onSuccess(); },
    onError: e => toast.error(e.response?.data?.message || 'Erreur'),
  });
  return (
    <div className="space-y-4">
      <Input label="Titre de la leçon" autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="ex: Les nombres réels — définitions" />
      {modules.length > 0 && (
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Module (optionnel)</label>
          <select value={moduleId} onChange={e => setModuleId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sans module</option>
            {modules.map(m => <option key={m._id} value={m._id}>{m.title}</option>)}
          </select>
        </div>
      )}
      <p className="text-xs text-gray-400">Le contenu et les exercices sont ajoutés depuis la liste des leçons.</p>
      <Button className="w-full" disabled={!title.trim()} loading={mutation.isPending} onClick={() => mutation.mutate()}>Créer la leçon</Button>
    </div>
  );
}
