const supabase = require('../config/supabase');
const { notifyInternalTeam, notifyUser } = require('./notificationService');
const { formatCurrency } = require('../utils/formatCurrency');

// Core logic behind submitting a payment, shared by the portal's POST
// /payments route and the WhatsApp paymentSubmission flow -- two front doors
// onto the same pipeline, not two implementations of it. `source` records
// which one was used (defaults to 'portal' so nothing changes for existing
// callers).
// Orders reach a payable state two ways: the existing manual flow
// (pending_approval -> approved, via approve_order) and the newer
// fast-checkout path (straight into stock_reserved, via
// checkout_quote_with_reservation) -- the manual bank-transfer fallback
// described in the PayFast ticket is submitted against a stock_reserved
// order the same way an existing approved order takes a manual payment
// today, so both statuses are accepted here.
const PAYABLE_STATUSES = ['approved', 'stock_reserved'];

async function submitPaymentForCustomer(
  customerId,
  customerLabel,
  { orderId, method, reference, amount, note, proofUrl },
  source = 'portal'
) {
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number, status')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (orderErr || !order) return { error: 'Order not found', status: 404 };
  if (!PAYABLE_STATUSES.includes(order.status)) {
    return { error: 'Payment can only be submitted for an approved or stock-reserved order.', status: 400 };
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
    .insert([
      {
        order_id: orderId,
        customer_id: customerId,
        method,
        reference,
        amount,
        note: note || null,
        proof_url: proofUrl || null,
        source,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  await notifyInternalTeam({
    type: 'general',
    title: 'New payment submitted',
    message: `${customerLabel} submitted a payment of ${formatCurrency(amount)} for order #${order.order_number} via ${source}.`,
    relatedType: 'payment',
    relatedId: payment.id,
  });

  return { paymentId: payment.id, orderNumber: order.order_number };
}

// Core logic behind approving/rejecting a manual bank-transfer payment,
// shared by the existing admin Payments page (paymentController.js's
// updatePaymentStatus) and the new admin_reviews queue
// (adminReviewService.js resolving a 'manual_payment' review) -- same two-
// front-doors-one-pipeline shape as everything else in this file.
async function reviewPayment(paymentId, status, reviewerId) {
  if (!['approved', 'rejected'].includes(status)) {
    return { error: "Status must be 'approved' or 'rejected'.", status: 400 };
  }

  const { data: payment, error: findErr } = await supabase
    .from('payments')
    .select('id, status, customer_id, order_id, users!payments_customer_id_fkey(email, company_name, phone), orders(order_number)')
    .eq('id', paymentId)
    .single();

  if (findErr || !payment) return { error: 'Payment not found', status: 404 };
  if (payment.status !== 'submitted') {
    return { error: `Payment is already "${payment.status}" and can't be reviewed again.`, status: 400 };
  }

  const { error } = await supabase
    .from('payments')
    .update({ status, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', paymentId);

  if (error) throw error;

  if (status === 'approved') {
    await notifyUser({
      userId: payment.customer_id,
      type: 'general',
      title: 'Payment approved',
      message: `Your payment for order #${payment.orders?.order_number} has been approved. Thank you!`,
      relatedType: 'payment',
      relatedId: paymentId,
      email: payment.users?.email,
      phone: payment.users?.phone,
    });
  }

  return {
    paymentId,
    status,
    orderId: payment.order_id,
    orderNumber: payment.orders?.order_number,
    customerLabel: payment.users?.company_name || payment.users?.email,
  };
}

module.exports = { submitPaymentForCustomer, reviewPayment };
