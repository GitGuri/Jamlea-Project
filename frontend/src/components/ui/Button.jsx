const VARIANTS = {
  primary: 'bg-teal-500 text-white hover:bg-teal-600 disabled:bg-teal-500/50',
  secondary: 'bg-white text-ink border border-slate-200 hover:bg-slate-50 disabled:opacity-50',
  danger: 'bg-white text-bad-500 border border-bad-500/30 hover:bg-bad-50 disabled:opacity-50',
  ghost: 'text-ink hover:bg-slate-100 disabled:opacity-50',
};

export default function Button({
  variant = 'primary',
  className = '',
  loading = false,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
