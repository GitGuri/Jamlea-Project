// Centralizes the card recipe that was hand-copied across ~20 pages
// (rounded-xl border border-slate-200 bg-white shadow-card). `className`
// passthrough covers the per-instance layout differences that already exist
// (overflow-hidden on table wrappers, padding, flex summary rows, etc).
//
// `hoverable` is opt-in, not default -- most of these containers (tables,
// detail summaries) aren't themselves clickable, so a hover lift on all of
// them would be a false affordance. Use it only where the card itself is an
// interactive target (e.g. a product grid tile).
export default function Card({ hoverable = false, className = '', children, ...props }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-card transition-shadow duration-200 ${hoverable ? 'hover:shadow-md' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
