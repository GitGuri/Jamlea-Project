import { useEffect, useState } from 'react';
import { getPendingStaffAdmin, reviewStaffSignupAdmin } from '../../api/staff';
import { formatDate } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';

export default function AdminStaffPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');

  const load = () => getPendingStaffAdmin().then(({ data }) => setRequests(data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleReview = async (id, status) => {
    setError('');
    setActingId(id);
    try {
      await reviewStaffSignupAdmin(id, status);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update this request.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Staff</h1>
      <p className="mt-1 text-sm text-slate-500">Pending staff signup requests awaiting approval.</p>

      {error && <p className="mt-4 rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}

      {loading ? (
        <Spinner />
      ) : requests.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No pending requests" description="New staff signups will show up here for review." />
        </div>
      ) : (
        <Card className="mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Requested role</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3 text-ink">{request.full_name}</td>
                  <td className="px-4 py-3 text-slate-600">{request.email}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{request.role.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(request.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleReview(request.id, 'approved')}
                      disabled={actingId === request.id}
                      className="text-xs font-medium text-good-500 transition-colors duration-150 hover:underline disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReview(request.id, 'rejected')}
                      disabled={actingId === request.id}
                      className="ml-3 text-xs font-medium text-bad-500 transition-colors duration-150 hover:underline disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
