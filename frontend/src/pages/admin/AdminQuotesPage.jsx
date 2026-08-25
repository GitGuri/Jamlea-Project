import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAllQuotesAdmin } from '../../api/quotes';
import { formatCurrency, formatDate } from '../../utils/formatters';
import StatusBadge from '../../components/ui/StatusBadge';
import SourceBadge from '../../components/ui/SourceBadge';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sourceFilter, setSourceFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    getAllQuotesAdmin()
      .then(({ data }) => setQuotes(data))
      .finally(() => setLoading(false));
  }, []);

  const visibleQuotes = useMemo(
    () => (sourceFilter === 'all' ? quotes : quotes.filter((q) => q.source === sourceFilter)),
    [quotes, sourceFilter]
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink">Quotes</h1>
          <p className="mt-1 text-sm text-slate-500">Every quote submitted across all customers.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition-colors duration-150 focus:border-teal-500"
          >
            <option value="all">All sources</option>
            <option value="portal">Portal</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="admin">Staff</option>
          </select>
          <Link to="/admin/quotes/new">
            <Button>New quote</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : visibleQuotes.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No quotes yet" description="Submitted customer quotes will show up here." />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleQuotes.map((quote) => (
                <tr
                  key={quote.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-slate-50"
                  onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs text-teal-600">#{quote.quote_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-ink">{quote.users?.company_name || quote.users?.email}</p>
                    {quote.users?.company_name && (
                      <p className="text-xs text-slate-400">{quote.users.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{quote.quote_items?.length || 0} items</td>
                  <td className="px-4 py-3 font-mono font-medium text-ink">{formatCurrency(quote.total_amount)}</td>
                  <td className="px-4 py-3"><SourceBadge source={quote.source} /></td>
                  <td className="px-4 py-3"><StatusBadge status={quote.status} /></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(quote.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
