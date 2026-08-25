import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllCustomersAdmin } from '../../api/customers';
import { getProducts } from '../../api/products';
import { createQuoteForCustomerAdmin } from '../../api/quotes';
import { formatCurrency } from '../../utils/formatters';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const SEARCH_INPUT_CLASS =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-teal-500';

// Deliberately not the global CartContext -- that's the logged-in staff
// member's own personal cart. Reusing it here would cross-wire whatever
// they're building for a customer with their own in-browser cart.
export default function AdminNewQuotePage() {
  const navigate = useNavigate();

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);

  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedCustomer || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      getAllCustomersAdmin({ search: customerQuery, limit: 8 }).then(({ data }) => setCustomerResults(data.data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerQuery, selectedCustomer]);

  useEffect(() => {
    if (!productQuery.trim()) {
      setProductResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      getProducts({ search: productQuery, limit: 8 }).then(({ data }) => setProductResults(data.data));
    }, 300);
    return () => clearTimeout(timeout);
  }, [productQuery]);

  const addItem = (product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        { product_id: product.id, name: product.name, sku: product.sku, unit_price: product.unit_price, quantity: 1 },
      ];
    });
    setProductQuery('');
    setProductResults([]);
  };

  const updateQuantity = (productId, quantity) => {
    setItems((prev) => prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i)));
  };

  const removeItem = (productId) => setItems((prev) => prev.filter((i) => i.product_id !== productId));

  const totalAmount = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = items.map((i) => ({ product_id: i.product_id, quantity: i.quantity }));
      const { data } = await createQuoteForCustomerAdmin(selectedCustomer.id, payload);
      navigate(`/admin/quotes/${data.quoteId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create this quote. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link to="/admin/quotes" className="text-sm text-teal-600 hover:underline">
        ← Back to quotes
      </Link>

      <h1 className="mt-3 font-display text-xl font-semibold text-ink">New quote for a customer</h1>
      <p className="mt-1 text-sm text-slate-500">Pick a customer and add products -- the quote is created in their name.</p>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-base font-semibold text-ink">Customer</h2>
        {selectedCustomer ? (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-ink">{selectedCustomer.company_name || selectedCustomer.email}</p>
              {selectedCustomer.company_name && <p className="text-xs text-slate-400">{selectedCustomer.email}</p>}
            </div>
            <button
              onClick={() => {
                setSelectedCustomer(null);
                setCustomerQuery('');
              }}
              className="text-xs font-medium text-teal-600 transition-colors duration-150 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <input
              type="text"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Search by email or company name"
              className={SEARCH_INPUT_CLASS}
            />
            {customerResults.length > 0 && (
              <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerResults([]);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-50"
                  >
                    <span className="text-ink">{c.company_name || c.email}</span>
                    {c.company_name && <span className="text-xs text-slate-400">{c.email}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="font-display text-base font-semibold text-ink">Products</h2>
        <div className="mt-3">
          <input
            type="text"
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
            placeholder="Search by name or SKU"
            className={SEARCH_INPUT_CLASS}
          />
          {productResults.length > 0 && (
            <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {productResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addItem(p)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-slate-50"
                >
                  <span>
                    <span className="text-ink">{p.name}</span>{' '}
                    <span className="font-mono text-xs text-slate-400">{p.sku}</span>
                  </span>
                  <span className="font-mono text-xs text-ink">{formatCurrency(p.unit_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2">Product</th>
                <th className="py-2">Unit price</th>
                <th className="py-2">Quantity</th>
                <th className="py-2">Subtotal</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.product_id}>
                  <td className="py-2">
                    <p className="font-medium text-ink">{item.name}</p>
                    <p className="font-mono text-xs text-slate-400">{item.sku}</p>
                  </td>
                  <td className="py-2 font-mono text-ink">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, Math.max(Number(e.target.value), 1))}
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none transition-colors duration-150 focus:border-teal-500"
                    />
                  </td>
                  <td className="py-2 font-mono font-medium text-ink">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="text-xs font-medium text-bad-500 transition-colors duration-150 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="mt-6 flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
          <p className="font-mono text-2xl font-semibold text-ink">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-sm text-bad-500">{error}</p>}
          <Button
            onClick={handleSubmit}
            loading={submitting}
            disabled={!selectedCustomer || items.length === 0}
          >
            Create quote
          </Button>
        </div>
      </Card>
    </div>
  );
}
