const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { createQuoteForCustomer, convertQuoteForCustomer } = require('../services/quoteService');

const createQuote = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const customerLabel = req.user.company_name || req.user.email;

  const result = await createQuoteForCustomer(req.user.id, customerLabel, items, 'portal');
  if (result.error) return res.status(result.status).json({ error: result.error });

  return res.status(201).json({ message: 'Quote created successfully', ...result });
});

const getCustomerQuotes = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, quote_items(*, products(name, sku))')
    .eq('customer_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json(data);
});

// Admin/sales_rep only: every customer's quotes.
const getAllQuotesAdmin = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, users(email, company_name), quote_items(*, products(name, sku))')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json(data);
});

// Admin/sales_rep only. Quotes don't have an approval workflow -- customers
// convert their own submitted quotes to orders -- so the only status change
// staff can make here is voiding a quote that's no longer live.
const updateQuoteStatus = asyncHandler(async (req, res) => {
  const { quoteId: id } = req.params;
  const { status } = req.body;

  if (status !== 'expired') {
    return res.status(400).json({ error: "Status must be 'expired'." });
  }

  const { data: quote, error: findErr } = await supabase
    .from('quotes')
    .select('id, status')
    .eq('id', id)
    .single();

  if (findErr || !quote) return res.status(404).json({ error: 'Quote not found' });

  if (!['draft', 'submitted'].includes(quote.status)) {
    return res.status(400).json({ error: `Quote is already "${quote.status}" and can't be marked expired.` });
  }

  const { error } = await supabase.from('quotes').update({ status: 'expired' }).eq('id', id);
  if (error) throw error;

  return res.json({ message: 'Quote marked as expired', quoteId: id, status: 'expired' });
});

const getQuoteById = asyncHandler(async (req, res) => {
  let query = supabase
    .from('quotes')
    .select('*, users(email, company_name), quote_items(*, products(name, sku))')
    .eq('id', req.params.quoteId);

  if (!['admin', 'sales_rep'].includes(req.user.role)) {
    query = query.eq('customer_id', req.user.id);
  }

  const { data, error } = await query.single();
  if (error || !data) return res.status(404).json({ error: 'Quote not found' });
  return res.json(data);
});

const convertQuoteToOrder = asyncHandler(async (req, res) => {
  const { quoteId } = req.params;
  const customerLabel = req.user.company_name || req.user.email;

  const result = await convertQuoteForCustomer(req.user.id, customerLabel, quoteId, 'portal');
  if (result.error) return res.status(result.status).json({ error: result.error });

  return res.status(201).json({ message: 'Order created successfully', ...result });
});

module.exports = {
  createQuote,
  getCustomerQuotes,
  getAllQuotesAdmin,
  getQuoteById,
  updateQuoteStatus,
  convertQuoteToOrder,
};
