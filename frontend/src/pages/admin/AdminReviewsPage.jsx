import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingReviews, resolveReview } from '../../api/adminReviews';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// Action pairs per review reason -- mirrors resolveReview's branching in
// adminReviewService.js exactly, so the buttons shown here are always ones
// the backend will actually accept.
const REASON_ACTIONS = {
  stock_short: [
    { action: 'approve', label: 'Approve anyway', variant: 'primary' },
    { action: 'reject', label: 'Reject', variant: 'danger' },
  ],
  manual_payment: [
    { action: 'approve', label: 'Approve payment', variant: 'primary' },
    { action: 'reject', label: 'Reject payment', variant: 'danger' },
  ],
  high_value: [
    { action: 'acknowledge', label: 'Acknowledge', variant: 'secondary' },
    { action: 'cancel', label: 'Cancel order', variant: 'danger' },
  ],
  new_customer: [
    { action: 'acknowledge', label: 'Acknowledge', variant: 'secondary' },
    { action: 'cancel', label: 'Cancel order', variant: 'danger' },
  ],
};

const REASON_LABELS = {
  stock_short: 'Insufficient stock',
  manual_payment: 'Manual payment submitted',
  high_value: 'High-value order',
  new_customer: 'First-time customer',
};

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => getPendingReviews().then(({ data }) => setReviews(data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const handleResolve = async (id, action) => {
    setError('');
    setActingId(id);
    try {
      await resolveReview(id, action);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resolve this review.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Admin review queue</h1>
      <p className="mt-1 text-sm text-slate-500">
        Orders the automated checkout couldn't fully handle on its own -- worked independently, one at a time.
      </p>

      {error && <p className="mt-4 rounded-lg bg-bad-50 px-3 py-2 text-sm text-bad-500">{error}</p>}

      {loading ? (
        <Spinner />
      ) : reviews.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nothing pending" description="Every order is either fully automated or already resolved." />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">
                    Order #{review.orders?.order_number}{' '}
                    <span className="font-normal text-slate-500">
                      -- {review.orders?.users?.company_name || review.orders?.users?.email}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {REASON_LABELS[review.reason] || review.reason} · {formatCurrency(review.orders?.total_amount)} ·
                    flagged {formatDate(review.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/admin/orders/${review.order_id}`)}
                  >
                    View order
                  </Button>
                  {(REASON_ACTIONS[review.reason] || []).map(({ action, label, variant }) => (
                    <Button
                      key={action}
                      variant={variant}
                      onClick={() => handleResolve(review.id, action)}
                      disabled={actingId === review.id}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
