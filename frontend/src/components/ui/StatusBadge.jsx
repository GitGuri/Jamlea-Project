const STYLES = {
  // quote statuses
  submitted: 'bg-amber-50 text-amber-600',
  converted: 'bg-good-50 text-good-500',
  expired: 'bg-slate-100 text-slate-500',
  // order statuses
  pending_approval: 'bg-amber-50 text-amber-600',
  approved: 'bg-teal-50 text-teal-600',
  processing: 'bg-teal-50 text-teal-600',
  completed: 'bg-good-50 text-good-500',
  cancelled: 'bg-bad-50 text-bad-500',
};

const DOT_STYLES = {
  submitted: 'bg-amber-500',
  converted: 'bg-good-500',
  expired: 'bg-slate-400',
  pending_approval: 'bg-amber-500',
  approved: 'bg-teal-500',
  processing: 'bg-teal-500',
  completed: 'bg-good-500',
  cancelled: 'bg-bad-500',
};

export default function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'unknown';
  const style = STYLES[status] || 'bg-slate-100 text-slate-500';
  const dot = DOT_STYLES[status] || 'bg-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
