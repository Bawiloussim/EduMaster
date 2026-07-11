import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../../../services/api';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import FileInput from '../../../../components/ui/FileInput';

export default function ImportStudentsModal({ open, onClose, onImported }) {
  const [file, setFile] = useState(null);

  const importMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post('/admin/import/students', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
    },
    onSuccess: (data) => {
      if (data.createdCount > 0) onImported?.();
      toast.success(`${data.createdCount} élève(s) importé(s)`);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Erreur lors de l\'import'),
  });

  const close = () => {
    setFile(null);
    importMutation.reset();
    onClose();
  };

  const result = importMutation.data;

  return (
    <Modal open={open} onClose={close} title="Importer des élèves (CSV)" size="lg">
      <p className="text-sm text-gray-500 mb-4">
        Colonnes attendues : <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">nom, email, classe, serie</code>
      </p>

      <FileInput accept=".csv,text/csv" onChange={setFile} label="Fichier CSV" />

      <div className="flex justify-end mt-4">
        <Button disabled={!file} loading={importMutation.isPending} onClick={() => importMutation.mutate()}>
          Importer
        </Button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          {result.created.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-green-700 font-medium text-sm mb-2">
                <CheckCircle2 className="h-4 w-4" /> {result.created.length} élève(s) créé(s)
              </div>
              <div className="bg-green-50 rounded-lg border border-green-100 divide-y divide-green-100 max-h-48 overflow-y-auto">
                {result.created.map((c) => (
                  <div key={c.email} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                    <span className="text-gray-700">{c.name} · {c.email}</span>
                    <code className="bg-white px-1.5 py-0.5 rounded border border-green-200">{c.tempPassword}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.errors.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-2">
                <AlertTriangle className="h-4 w-4" /> {result.errors.length} ligne(s) ignorée(s)
              </div>
              <div className="bg-amber-50 rounded-lg border border-amber-100 divide-y divide-amber-100 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-xs text-gray-700">
                    Ligne {e.row} ({e.email || '—'}) : {e.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
