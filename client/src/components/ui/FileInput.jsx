import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

export default function FileInput({ accept, onChange, label }) {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  const handleChange = (e) => {
    const file = e.target.files?.[0] || null;
    setFileName(file?.name || '');
    onChange?.(file);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <Upload className="h-4 w-4 shrink-0" />
        {fileName || 'Choisir un fichier...'}
      </button>
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
    </div>
  );
}
