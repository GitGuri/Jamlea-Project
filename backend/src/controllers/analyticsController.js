const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

const QUOTE_STATUSES = ['draft', 'submitted', 'converted', 'expired'];
const SPEND_EXCLUDED_STATUSES = ['cancelled'];

// Admin/sales_rep only. Everything here is aggregated in JS from the raw
// tables (quotes, order_items+products, users+orders) -- same approach as
// customerController.js, no Postgres views/RPCs needed for this data scale.
const getAnalyticsSummary = asyncHandler(async (req, res) => {
  const { data: quotes, error: quotesErr } = await supabase.from('quotes').select('status');
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
