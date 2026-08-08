const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../services/notificationService');

const ORDER_STATUSES = ['pending_approval', 'approved', 'processing', 'completed', 'cancelled'];

const getCustomerOrders = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, sku))')
    .eq('customer_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json(data);
});

const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, users(email, company_name), order_items(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json(data);
});

const getOrderById = asyncHandler(async (req, res) => {
  let query = supabase
    .from('orders')
    .select('*, order_items(*, products(name, sku)), users(email, company_name)')
    .eq('id', req.params.id);

  if (!['admin', 'sales_rep'].includes(req.user.role)) {
    query = query.eq('customer_id', req.user.id);
  }

  const { data, error } = await query.single();
  if (error || !data) return res.status(404).json({ error: 'Order not found' });
  return res.json(data);
});

// Admin/sales_rep only. Approval and cancellation run through Postgres functions
// that atomically manage stock (decrement on approval, restock on cancellation).
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!ORDER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
  }

  const { data: order, error: findErr } = await supabase
    .from('orders')
    .select('id, customer_id, users(email, company_name)')
    .eq('id', id)
    .single();

  if (findErr || !order) return res.status(404).json({ error: 'Order not found' });

  if (status === 'approved') {
    const { error } = await supabase.rpc('approve_order', { p_order_id: id });
    if (error) return res.status(400).json({ error: error.message });
  } else if (status === 'cancelled') {
    const { error } = await supabase.rpc('cancel_order', { p_order_id: id });
    if (error) return res.status(400).json({ error: error.message });
  } else {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }

  await notifyUser({
    userId: order.customer_id,
    type: 'order_status_changed',
    title: 'Order status updated',
    message: `Your order ${id} is now "${status.replace('_', ' ')}".`,
    relatedType: 'order',
    relatedId: id,
    email: order.users?.email,
  });

  return res.json({ message: 'Order status updated', orderId: id, status });
});

module.exports = { getCustomerOrders, getAllOrdersAdmin, getOrderById, updateOrderStatus };
