const variants = {
  primary: 'bg-brand hover:bg-brand-dark text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
  danger: 'bg-danger hover:bg-danger text-white',
  outline: 'border border-brand text-brand hover:bg-brand/10',
  ghost: 'text-gray-600 hover:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({ children, variant = 'primary', size = 'md', className = '', loading, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
