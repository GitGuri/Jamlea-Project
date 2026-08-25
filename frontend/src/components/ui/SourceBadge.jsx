// Distinct from StatusBadge's color language (amber/green/maroon = state)
// on purpose -- this is a channel, not a status. 'admin' means a staff
// member created it on the customer's behalf (source is set server-side,
// see quoteController.js's convertQuoteToOrder/createQuoteForCustomerAdmin).
const SOURCE_LABELS = { whatsapp: 'WhatsApp', admin: 'Staff' };
const SOURCE_CLASSES = { whatsapp: 'bg-teal-50 text-teal-600', admin: 'bg-maroon-50 text-maroon-500' };

export default function SourceBadge({ source }) {
  const label = SOURCE_LABELS[source] || 'Portal';
  const classes = SOURCE_CLASSES[source] || 'bg-slate-100 text-slate-500';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}
