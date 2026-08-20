const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

const QUOTE_STATUSES = ['draft', 'submitted', 'converted', 'expired'];
const ORDER_STATUSES = ['pending_approval', 'approved', 'processing', 'completed', 'cancelled'];
const SPEND_EXCLUDED_STATUSES = ['cancelled'];
const TREND_DAYS = 30;

// Zero-filled so the trend chart shows real gaps instead of skipping days
// with no orders -- an empty day and a missing bucket look identical to a
// caller that just indexes by date.
function lastNDates(n) {
  const dates = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// Admin/sales_rep only. Everything here is aggregated in JS from the raw
// tables (quotes, order_items+products, orders, payments, users+orders) --
// same approach as customerController.js, no Postgres views/RPCs needed for
// this data scale.
const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const { data: quotes, error: quotesErr } = await supabase.from('quotes').select('status, source');
  if (quotesErr) throw quotesErr;

  const counts = QUOTE_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  for (const q of quotes) counts[q.status] = (counts[q.status] || 0) + 1;
  const nonDraftTotal = quotes.length - counts.draft;
  const conversionRate = nonDraftTotal > 0 ? counts.converted / nonDraftTotal : 0;

  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select('quantity, unit_price, product_id, products(name, sku, category)');
  if (itemsErr) throw itemsErr;

  const productStats = new Map();
  const categoryStats = new Map();
  for (const item of orderItems) {
    const revenue = item.quantity * item.unit_price;

    const product = productStats.get(item.product_id) || {
      product_id: item.product_id,
      name: item.products?.name || 'Unknown product',
      sku: item.products?.sku,
      quantity: 0,
      revenue: 0,
    };
    product.quantity += item.quantity;
    product.revenue += revenue;
    productStats.set(item.product_id, product);

    const categoryKey = item.products?.category || 'uncategorized';
    const category = categoryStats.get(categoryKey) || { category: categoryKey, quantity: 0, revenue: 0 };
    category.quantity += item.quantity;
    category.revenue += revenue;
    categoryStats.set(categoryKey, category);
  }

  const topProducts = [...productStats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topCategories = [...categoryStats.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('status, total_amount, created_at, source');
  if (ordersErr) throw ordersErr;

  const orderCounts = ORDER_STATUSES.reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
  const sellableOrders = orders.filter((o) => !SPEND_EXCLUDED_STATUSES.includes(o.status));
  for (const o of orders) orderCounts[o.status] = (orderCounts[o.status] || 0) + 1;

  const revenueTotal = sellableOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const averageOrderValue = sellableOrders.length > 0 ? revenueTotal / sellableOrders.length : 0;

  const revenueByDate = new Map();
  for (const o of sellableOrders) {
    const date = o.created_at.slice(0, 10);
    revenueByDate.set(date, (revenueByDate.get(date) || 0) + Number(o.total_amount || 0));
  }
  const revenueOverTime = lastNDates(TREND_DAYS).map((date) => ({ date, revenue: revenueByDate.get(date) || 0 }));

  const orderSourceCounts = { portal: 0, whatsapp: 0 };
  for (const o of orders) orderSourceCounts[o.source === 'whatsapp' ? 'whatsapp' : 'portal'] += 1;
  const quoteSourceCounts = { portal: 0, whatsapp: 0 };
  for (const q of quotes) quoteSourceCounts[q.source === 'whatsapp' ? 'whatsapp' : 'portal'] += 1;

  const { data: payments, error: paymentsErr } = await supabase.from('payments').select('status, amount');
  if (paymentsErr) throw paymentsErr;

  const paymentStats = { collected: { count: 0, amount: 0 }, pendingReview: { count: 0, amount: 0 }, rejected: { count: 0, amount: 0 } };
  const PAYMENT_BUCKET = { approved: 'collected', submitted: 'pendingReview', rejected: 'rejected' };
  for (const p of payments) {
    const bucket = PAYMENT_BUCKET[p.status];
    if (!bucket) continue;
    paymentStats[bucket].count += 1;
    paymentStats[bucket].amount += Number(p.amount || 0);
  }

  const { data: customers, error: custErr } = await supabase
    .from('users')
    .select('id, email, company_name, created_at, orders(status, total_amount)')
    .eq('role', 'customer');
  if (custErr) throw custErr;

  const customerStats = customers.map((c) => {
    const countedOrders = (c.orders || []).filter((o) => !SPEND_EXCLUDED_STATUSES.includes(o.status));
    return {
      id: c.id,
      email: c.email,
      company_name: c.company_name,
      order_count: c.orders?.length || 0,
      total_spent: countedOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
    };
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  return res.json({
    quoteFunnel: { counts, conversionRate, total: quotes.length },
    orderFunnel: { counts: orderCounts, total: orders.length },
    revenue: { total: revenueTotal, averageOrderValue },
    revenueOverTime,
    payments: paymentStats,
    sourceBreakdown: { quotes: quoteSourceCounts, orders: orderSourceCounts },
    topProducts,
    topCategories,
    customers: {
      total: customers.length,
      newLast30Days: customers.filter((c) => c.created_at >= thirtyDaysAgo).length,
      topBySpend: [...customerStats].sort((a, b) => b.total_spent - a.total_spent).slice(0, 10),
      topByOrders: [...customerStats].sort((a, b) => b.order_count - a.order_count).slice(0, 10),
    },
  });
});

module.exports = { getAnalyticsSummary };
