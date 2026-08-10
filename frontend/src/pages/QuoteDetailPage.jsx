import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getQuoteById, convertQuoteToOrder } from '../api/quotes';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatusBadge from '../components/ui/StatusBadge';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';

export default function QuoteDetailPage() {
  const { quoteId } = useParams();
  const navigate = useNavigate();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getQuoteById(quoteId)
      .then(({ data }) => setQuote(data))
      .finally(() => setLoading(false));
  }, [quoteId]);

  const handleConvert = async () => {
    setError('');
    setConverting(true);
    try {
      const { data } = await convertQuoteToOrder(quoteId);
      navigate(`/orders/${data.orderId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not convert this quote.');
    } finally {
      setConverting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!quote) return <p className="text-sm text-slate-500">Quote not found.</p>;

  const canConvert = quote.status === 'submitted';

  return (
    <div>
      <Link to="/quotes" className="text-sm text-teal-600 hover:underline">
        ← Back to quotes
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">
            Quote <span className="font-mono text-base text-slate-400">#{quote.id.slice(0, 8)}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">Submitted {formatDate(quote.created_at)}</p>
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
          {canConvert && (
            <Button onClick={handleConvert} loading={converting}>
              Convert to order
            </Button>
          )}
          {quote.status === 'converted' && (
            <p className="text-sm text-slate-500">This quote has already been converted to an order.</p>
          )}
          {quote.status === 'expired' && (
            <p className="text-sm text-slate-500">This quote has expired and can no longer be converted.</p>
          )}
        </div>
      </div>
    </div>
  );
}
