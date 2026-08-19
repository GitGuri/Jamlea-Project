import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuoteById, updateQuoteStatus } from '../../api/quotes';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';

export default function AdminQuoteDetailPage() {
  const { quoteId } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = () => getQuoteById(quoteId).then(({ data }) => setQuote(data));

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId]);

  const handleExpire = async () => {
    setError('');
    setUpdating(true);
    try {
      await updateQuoteStatus(quoteId, 'expired');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update this quote.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Spinner />;
  if (!quote) return <p className="text-sm text-slate-500">Quote not found.</p>;

  const canExpire = ['draft', 'submitted'].includes(quote.status);

  return (
    <div>
      <Link to="/admin/quotes" className="text-sm text-teal-600 hover:underline">
        ← Back to quotes
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">
            Quote <span className="font-mono text-base text-slate-400">#{quote.quote_number}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {quote.users?.company_name || quote.users?.email} · Submitted {formatDate(quote.created_at)}
          </p>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quote.quote_items?.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{item.products?.name}</p>
                  <p className="font-mono text-xs text-slate-400">{item.products?.sku}</p>
                </td>
                <td className="px-4 py-3 font-mono text-ink">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3 text-slate-600">{item.quantity}</td>
                <td className="px-4 py-3 font-mono font-medium text-ink">
                  {formatCurrency(item.unit_price * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="font-mono text-2xl font-semibold text-ink">{formatCurrency(quote.total_amount)}</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-bad-500">{error}</p>}
          {canExpire && (
            <Button variant="danger" onClick={handleExpire} loading={updating}>
              Mark expired
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
