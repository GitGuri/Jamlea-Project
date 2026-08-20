import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllOrdersAdmin } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import SourceBadge from '../../components/ui/SourceBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    getAllOrdersAdmin()
      .then(({ data }) => setOrders(data))
      .finally(() => setLoading(false));
  }, []);

  const visibleOrders = useMemo(
    () => (sourceFilter === 'all' ? orders : orders.filter((o) => o.source === sourceFilter)),
    [orders, sourceFilter]
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Orders</h1>
          <p className="mt-1 text-sm text-slate-500">Every order placed across all customers.</p>
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-teal-500"
        >
          <option value="all">All sources</option>
          <option value="portal">Portal</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : visibleOrders.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No orders yet" description="Orders converted from customer quotes will show up here." />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-slate-50"
                  onClick={() => navigate(`/admin/orders/${order.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-teal-600">#{order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{order.users?.company_name || order.users?.email}</p>
                    {order.users?.company_name && (
                      <p className="text-xs text-slate-400">{order.users.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{order.order_items?.length || 0} items</td>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{formatCurrency(order.total_amount)}</td>
                  <td className="px-4 py-3"><SourceBadge source={order.source} /></td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
