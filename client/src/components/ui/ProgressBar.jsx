export default function ProgressBar({ value = 0, className = '', showLabel = false }) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped === 100 ? 'bg-success' : clamped >= 60 ? 'bg-brand' : 'bg-brand/60';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-500 w-8">{clamped}%</span>}
    </div>
  );
}
