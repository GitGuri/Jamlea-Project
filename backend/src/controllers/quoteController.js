const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { notifyInternalTeam } = require('../services/notificationService');

const createQuote = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const customer_id = req.user.id;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Quote items are required' });
  }

  const productIds = items.map((i) => i.product_id);
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, unit_price')
    .in('id', productIds);

  if (pErr) throw pErr;
  if (products.length !== new Set(productIds).size) {
    return res.status(400).json({ error: 'One or more products were not found' });
  }

  const priceMap = new Map(products.map((p) => [p.id, p.unit_price]));

  let total_amount = 0;
  const quoteItemsData = items.map((item) => {
    const price = priceMap.get(item.product_id);
    total_amount += price * item.quantity;
    return {
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: price,
    };
  });

  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .insert([{ customer_id, total_amount, status: 'submitted' }])
    .select()
    .single();

  if (qErr) throw qErr;

  const itemsToInsert = quoteItemsData.map((item) => ({
    ...item,
    quote_id: quote.id,
  }));

  const { error: qiErr } = await supabase.from('quote_items').insert(itemsToInsert);
  if (qiErr) throw qiErr;

  await notifyInternalTeam({
    type: 'quote_submitted',
    title: 'New quote submitted',
    message: `${req.user.company_name || req.user.email} submitted a quote for $${total_amount.toFixed(2)}.`,
    relatedType: 'quote',
    relatedId: quote.id,
  });

  return res.status(201).json({ message: 'Quote created successfully', quoteId: quote.id, total_amount });
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

const getQuoteById = asyncHandler(async (req, res) => {
  let query = supabase
    .from('quotes')
    .select('*, quote_items(*, products(name, sku))')
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
  const customer_id = req.user.id;

  const { data: quote, error: qErr } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('id', quoteId)
    .eq('customer_id', customer_id)
    .single();

  if (qErr || !quote) return res.status(404).json({ error: 'Quote not found.' });
  if (quote.status === 'converted') return res.status(400).json({ error: 'Quote already converted' });
  if (quote.status === 'expired') return res.status(400).json({ error: 'Quote has expired' });

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert([{ quote_id: quote.id, customer_id, total_amount: quote.total_amount }])
    .select()
    .single();

  if (oErr) throw oErr;

  const orderItems = quote.quote_items.map((qi) => ({
    order_id: order.id,
    product_id: qi.product_id,
    quantity: qi.quantity,
    unit_price: qi.unit_price,
  }));

  const { error: oiErr } = await supabase.from('order_items').insert(orderItems);
  if (oiErr) throw oiErr;

  await supabase.from('quotes').update({ status: 'converted' }).eq('id', quote.id);

  await notifyInternalTeam({
    type: 'quote_converted',
    title: 'Quote converted to order',
    message: `${req.user.company_name || req.user.email} converted quote ${quote.id} into order ${order.id}, awaiting approval.`,
    relatedType: 'order',
    relatedId: order.id,
  });

  return res.status(201).json({ message: 'Order created successfully', orderId: order.id });
});

module.exports = { createQuote, getCustomerQuotes, getQuoteById, convertQuoteToOrder };
