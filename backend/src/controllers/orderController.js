const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../services/notificationService');
const { notifyIfLowStockCrossing } = require('./productController');

const ORDER_STATUSES = ['pending_approval', 'approved', 'processing', 'completed', 'cancelled'];

// Only 'approved' and 'cancelled' route through the stock-managing RPCs
// (approve_order decrements stock, cancel_order restocks). Without this map,
// staff could jump an order straight from pending_approval to completed and
// the order would be marked fulfilled without stock ever being decremented.
const ORDER_TRANSITIONS = {
  pending_approval: ['approved', 'cancelled'],
  approved: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const STATUS_NOTIFICATIONS = {
  approved: (orderNumber) => ({
    title: 'Order approved',
    message: `Good news -- your order #${orderNumber} has been approved. Submit your payment details on the Customer Portal or via WhatsApp ("Submit a payment" from the main menu).`,
  }),
  cancelled: (orderNumber) => ({
    title: 'Order cancelled',
    message: `Unfortunately, your order #${orderNumber} has been cancelled. Contact us if you have any questions.`,
  }),
  processing: (orderNumber) => ({
    title: 'Order in progress',
    message: `Your order #${orderNumber} is now being processed.`,
  }),
  completed: (orderNumber) => ({
    title: 'Order completed',
    message: `Your order #${orderNumber} has been completed.`,
  }),
};

const getCustomerOrders = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, sku)), payments(*)')
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
    .select('*, order_items(*, products(name, sku)), users(email, company_name), payments(*)')
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
    .select('id, order_number, status, customer_id, users(email, company_name)')
    .eq('id', id)
    .single();

  if (findErr || !order) return res.status(404).json({ error: 'Order not found' });

  if (!ORDER_TRANSITIONS[order.status]?.includes(status)) {
    return res.status(400).json({
      error: `Cannot move order from "${order.status}" to "${status}".`,
    });
  }

  if (status === 'approved') {
    // approve_order decrements stock for every item on this order. Snapshot
    // stock before, and check for a low-stock crossing on each affected
    // product after, since this Postgres function is the other place
    // (besides a direct product edit) stock_quantity actually changes.
    const { data: items } = await supabase.from('order_items').select('product_id').eq('order_id', id);
    const productIds = [...new Set((items || []).map((i) => i.product_id))];

    const { data: beforeProducts } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .in('id', productIds);
    const previousStockById = new Map((beforeProducts || []).map((p) => [p.id, p.stock_quantity]));

    const { error } = await supabase.rpc('approve_order', { p_order_id: id });
    if (error) return res.status(400).json({ error: error.message });

    const { data: afterProducts } = await supabase
      .from('products')
      .select('id, sku, name, stock_quantity')
      .in('id', productIds);
    for (const product of afterProducts || []) {
      await notifyIfLowStockCrossing(previousStockById.get(product.id), product);
    }
  } else if (status === 'cancelled') {
    const { error } = await supabase.rpc('cancel_order', { p_order_id: id });
    if (error) return res.status(400).json({ error: error.message });
  } else {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) throw error;
  }

  const { title, message } = STATUS_NOTIFICATIONS[status]?.(order.order_number) || {
    title: 'Order status updated',
    message: `Your order #${order.order_number} is now "${status.replace('_', ' ')}".`,
  };

  await notifyUser({
    userId: order.customer_id,
    type: 'order_status_changed',
    title,
    message,
    relatedType: 'order',
    relatedId: id,
    email: order.users?.email,
  });

  return res.json({ message: 'Order status updated', orderId: id, status });
});

module.exports = { getCustomerOrders, getAllOrdersAdmin, getOrderById, updateOrderStatus };
