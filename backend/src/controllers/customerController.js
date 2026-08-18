const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

// Orders in these statuses don't represent real revenue -- excluded from
// total_spent the same way a "completed sales" figure would exclude them.
const SPEND_EXCLUDED_STATUSES = ['cancelled'];

function summarizeOrders(orders = []) {
  const counted = orders.filter((o) => !SPEND_EXCLUDED_STATUSES.includes(o.status));
  const total_spent = counted.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const last_order_at = orders.reduce((latest, o) => {
    return !latest || o.created_at > latest ? o.created_at : latest;
  }, null);
  return { order_count: orders.length, total_spent, last_order_at };
}

// Admin/sales_rep only: every customer with order/quote counts and lifetime
// spend. There's no GROUP BY available through the Supabase client without
// a Postgres view/RPC, so this aggregates in JS the same way the analytics
// endpoint does -- fine at this data scale, matches the rest of this codebase.
const getAllCustomersAdmin = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  let query = supabase
    .from('users')
    .select('id, email, company_name, created_at, orders(id, status, total_amount, created_at), quotes(id)', {
      count: 'exact',
    })
    .eq('role', 'customer')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (search) {
    const safeSearch = search.replace(/[,()]/g, '');
    query = query.or(`email.ilike.%${safeSearch}%,company_name.ilike.%${safeSearch}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const customers = data.map(({ orders, quotes, ...customer }) => ({
    ...customer,
    quote_count: quotes.length,
    ...summarizeOrders(orders),
  }));

  return res.json({ data: customers, page: pageNum, limit: limitNum, total: count });
});

// Admin/sales_rep only: one customer's profile plus full order/quote history.
const getCustomerDetailAdmin = asyncHandler(async (req, res) => {
  const { data: customer, error: customerErr } = await supabase
    .from('users')
    .select('id, email, company_name, phone, created_at')
    .eq('id', req.params.id)
    .eq('role', 'customer')
    .single();

  if (customerErr || !customer) return res.status(404).json({ error: 'Customer not found' });

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, sku))')
    .eq('customer_id', req.params.id)
    .order('created_at', { ascending: false });
  if (ordersErr) throw ordersErr;

  const { data: quotes, error: quotesErr } = await supabase
    .from('quotes')
    .select('*, quote_items(*, products(name, sku))')
    .eq('customer_id', req.params.id)
    .order('created_at', { ascending: false });
  if (quotesErr) throw quotesErr;

  return res.json({ ...customer, ...summarizeOrders(orders), orders, quotes });
});

module.exports = { getAllCustomersAdmin, getCustomerDetailAdmin };
