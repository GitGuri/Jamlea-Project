import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createQuote } from '../api/quotes';
import { formatCurrency } from '../utils/formatters';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, totalAmount } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
      const { data } = await createQuote(payload);
      clearCart();
      navigate(`/quotes/${data.quoteId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit the quote. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your quote is empty"
        description="Add products from the catalog to start building a quote."
        action={
          <Link to="/products">
            <Button>Browse products</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Quote builder</h1>
      <p className="mt-1 text-sm text-slate-500">Review your items, then submit for a formal quote.</p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Unit price</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Subtotal</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.product_id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{item.name}</p>
                  <p className="font-mono text-xs text-slate-400">{item.sku}</p>
                </td>
                <td className="px-4 py-3 font-mono text-ink">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={item.min_order_qty}
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantity(item.product_id, Math.max(Number(e.target.value), item.min_order_qty))
                    }
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-teal-500"
                  />
                </td>
                <td className="px-4 py-3 font-mono font-medium text-ink">
                  {formatCurrency(item.unit_price * item.quantity)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className="text-xs font-medium text-bad-500 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="font-mono text-2xl font-semibold text-ink">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-bad-500">{error}</p>}
          <Button variant="secondary" onClick={clearCart} disabled={submitting}>
            Clear
          </Button>
          <Button onClick={handleSubmit} loading={submitting}>
            Submit quote
          </Button>
        </div>
      </div>
    </div>
  );
}
