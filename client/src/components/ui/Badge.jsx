const colors = {
  blue: 'bg-brand/15 text-primary',
  green: 'bg-success-light text-success',
  red: 'bg-danger-light text-danger',
  yellow: 'bg-warning-light text-warning',
  gray: 'bg-gray-100 text-gray-700',
  purple: 'bg-purple-100 text-purple-800',
};

export default function Badge({ children, color = 'blue', className = '' }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
