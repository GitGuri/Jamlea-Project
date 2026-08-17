import { useEffect, useState } from 'react';
import { getAnalyticsSummary } from '../../api/analytics';
import { formatCurrency } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';

function StatTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-ink">{value}</p>
    </div>
  );
}

// Single-hue sequential bars for a magnitude comparison -- one series, so no
// legend needed (the section title already says what's plotted). Value sits
// at the bar's tip, per the dataviz skill's mark spec.
function BarList({ items, labelKey, valueKey, formatValue }) {
  const max = Math.max(...items.map((i) => i[valueKey]), 1);

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item[labelKey]} className="flex items-center gap-3">
          <p className="w-40 shrink-0 truncate text-sm text-slate-600" title={item[labelKey]}>
            {item[labelKey]}
          </p>
          <div className="flex flex-1 items-center gap-2">
            <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-teal-500"
                style={{ width: `${Math.max((item[valueKey] / max) * 100, 3)}%` }}
              />
            </div>
            <p className="w-20 shrink-0 text-right font-mono text-xs text-ink">{formatValue(item[valueKey])}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsSummary()
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-sm text-slate-500">Could not load analytics.</p>;

  const { quoteFunnel, topProducts, topCategories, customers } = data;

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-ink">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">Quote conversion, top sellers, and customer activity.</p>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatTile label="Quotes submitted" value={quoteFunnel.total - quoteFunnel.counts.draft} />
        <StatTile label="Conversion rate" value={`${Math.round(quoteFunnel.conversionRate * 100)}%`} />
        <StatTile label="Customers" value={customers.total} />
        <StatTile label="New customers (30d)" value={customers.newLast30Days} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Quote funnel</h2>
          <p className="mt-1 text-xs text-slate-500">Submitted quotes by current status.</p>
          <div className="mt-4">
            <BarList
              items={[
                { name: 'Submitted', value: quoteFunnel.counts.submitted },
                { name: 'Converted', value: quoteFunnel.counts.converted },
                { name: 'Expired', value: quoteFunnel.counts.expired },
              ]}
              labelKey="name"
              valueKey="value"
              formatValue={(v) => String(v)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Top categories</h2>
          <p className="mt-1 text-xs text-slate-500">By revenue from order line items.</p>
          <div className="mt-4">
            {topCategories.length === 0 ? (
              <p className="text-sm text-slate-500">No order data yet.</p>
            ) : (
              <BarList
                items={topCategories}
                labelKey="category"
                valueKey="revenue"
                formatValue={formatCurrency}
              />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Top products</h2>
          <p className="mt-1 text-xs text-slate-500">By revenue from order line items.</p>
          <div className="mt-4">
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No order data yet.</p>
            ) : (
              <BarList items={topProducts} labelKey="name" valueKey="revenue" formatValue={formatCurrency} />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="font-display text-base font-semibold text-ink">Top customers</h2>
          <p className="mt-1 text-xs text-slate-500">By lifetime spend (cancelled orders excluded).</p>
          {customers.topBySpend.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No customers yet.</p>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.topBySpend.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2 text-ink">{c.company_name || c.email}</td>
                    <td className="py-2 text-right text-slate-600">{c.order_count}</td>
                    <td className="py-2 text-right font-mono text-ink">{formatCurrency(c.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
