// Distinct from StatusBadge's color language (amber/green/maroon = state)
// on purpose -- this is a channel, not a status, so it uses the brand
// navy accent instead of overlapping with status meanings.
export default function SourceBadge({ source }) {
  const isWhatsapp = source === 'whatsapp';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isWhatsapp ? 'bg-teal-50 text-teal-600' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {isWhatsapp ? 'WhatsApp' : 'Portal'}
    </span>
  );
}
