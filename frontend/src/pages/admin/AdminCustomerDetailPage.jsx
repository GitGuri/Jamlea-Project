import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCustomerDetailAdmin } from '../../api/customers';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCustomerDetailAdmin(id)
      .then(({ data }) => setCustomer(data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (!customer) return <p className="text-sm text-slate-500">Customer not found.</p>;

  return (
    <div>
      <Link to="/admin/customers" className="text-sm text-teal-600 hover:underline">
        ← Back to customers
      </Link>

      <div className="mt-3">
        <h1 className="font-display text-xl font-semibold text-ink">
          {customer.company_name || customer.email}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {customer.email} · Joined {formatDate(customer.created_at)}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Total spent</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ink">{formatCurrency(customer.total_spent)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Orders</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-ink">{customer.order_count}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Last order</p>
          <p className="mt-1 text-sm font-medium text-ink">
            {customer.last_order_at ? formatDate(customer.last_order_at) : 'No orders yet'}
          </p>
        </div>
      </div>

      <h2 className="mt-8 font-display text-base font-semibold text-ink">Orders</h2>
      {customer.orders.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No orders yet" description="This customer hasn't placed an order." />
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customer.orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-teal-600">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-600">{order.order_items?.length || 0} items</td>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mt-8 font-display text-base font-semibold text-ink">Quotes</h2>
      {customer.quotes.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No quotes yet" description="This customer hasn't submitted a quote." />
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customer.quotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-teal-600">#{quote.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-slate-600">{quote.quote_items?.length || 0} items</td>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{formatCurrency(quote.total_amount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={quote.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(quote.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
