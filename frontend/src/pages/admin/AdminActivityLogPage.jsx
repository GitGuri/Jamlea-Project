import { useEffect, useState } from 'react';
import { getActivityLog } from '../../api/activityLog';
import { formatDate } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const LIMIT = 50;

// Admin only -- see backend/src/routes/activityLogRoutes.js. This is
// deliberately not shown to sales_rep accounts, since part of its purpose
// is oversight of what they (and other admins) have done.
export default function AdminActivityLogPage() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getActivityLog({ page: 1, limit: LIMIT })
      .then(({ data }) => {
        setEntries(data.data);
        setTotal(data.total);
      })
      .catch(() => setError('Could not load the activity log.'))
      .finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await getActivityLog({ page: nextPage, limit: LIMIT });
      setEntries((prev) => [...prev, ...data.data]);
      setPage(nextPage);
    } catch {
      setError('Could not load more entries.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Activity log</h1>
      <p className="mt-1 text-sm text-slate-500">
        Every significant action across the app -- order decisions, payment and review outcomes, quote
        conversions, and account changes. Visible to admins only.
      </p>

      {error && <p className="mt-4 rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}

      {loading ? (
        <Spinner />
      ) : entries.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No activity yet" description="Actions taken across the app will show up here." />
        </div>
      ) : (
        <>
          <Card className="mt-6 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Who</th>
                  <th className="px-4 py-3">What happened</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(entry.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink">{entry.actor_label}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {entries.length < total && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
