const supabase = require('../config/supabase');
const { notifyInternalTeam } = require('./notificationService');

// Core logic behind submitting a payment, shared by the portal's POST
// /payments route and the WhatsApp paymentSubmission flow -- two front doors
// onto the same pipeline, not two implementations of it. `source` records
// which one was used (defaults to 'portal' so nothing changes for existing
// callers).
async function submitPaymentForCustomer(customerId, customerLabel, { orderId, method, reference, amount, note }, source = 'portal') {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number, status')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (orderErr || !order) return { error: 'Order not found', status: 404 };
  if (order.status !== 'approved') {
    return { error: 'Payment can only be submitted for an approved order.', status: 400 };
  }

  const { data: existing, error: existingErr } = await supabase
    .from('payments')
    .select('id')
    .eq('order_id', orderId)
    .in('status', ['submitted', 'approved']);

  if (existingErr) throw existingErr;
  if (existing && existing.length > 0) {
    return { error: 'A payment has already been submitted for this order.', status: 400 };
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert([{ order_id: orderId, customer_id: customerId, method, reference, amount, note: note || null, source }])
    .select()
    .single();

  if (error) throw error;

  await notifyInternalTeam({
    type: 'general',
    title: 'New payment submitted',
    message: `${customerLabel} submitted a payment of ${Number(amount).toFixed(2)} for order #${order.order_number} via ${source}.`,
    relatedType: 'payment',
    relatedId: payment.id,
  });

  return { paymentId: payment.id, orderNumber: order.order_number };
}

module.exports = { submitPaymentForCustomer };
