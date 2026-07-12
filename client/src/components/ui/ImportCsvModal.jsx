import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import Modal from './Modal';
import Button from './Button';
import FileInput from './FileInput';

export default function ImportCsvModal({ open, onClose, onImported, title, endpoint, helpText, createdHeading, toastMessage, renderCreatedItem }) {
  const [file, setFile] = useState(null);

  const importMutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(endpoint, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data.data);
    },
    onSuccess: (data) => {
      if (data.createdCount > 0) onImported?.();
      toast.success(toastMessage(data.createdCount));
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
    <Modal open={open} onClose={close} title={title} size="lg">
      <p className="text-sm text-gray-500 mb-4">{helpText}</p>

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
              <div className="flex items-center gap-2 text-success font-medium text-sm mb-2">
                <CheckCircle2 className="h-4 w-4" /> {createdHeading(result.created.length)}
              </div>
              <div className="bg-success-light rounded-lg border border-success-light divide-y divide-success-light max-h-48 overflow-y-auto">
                {result.created.map((c, i) => (
                  <div key={i} className="px-3 py-2 text-xs flex items-center justify-between gap-2">
                    {renderCreatedItem(c)}
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
