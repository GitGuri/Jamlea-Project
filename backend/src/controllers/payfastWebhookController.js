const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { verifyItnSignature, revalidateWithPayfast } = require('../services/payfastService');
const { transitionOrderStatus } = require('../services/orderStateService');
const { notifyUser } = require('../services/notificationService');
const { logActivity } = require('../services/activityLogService');

// PayFast's ITN (Instant Transaction Notification) -- the only path that's
// ever trusted to confirm a payment. The browser return_url redirect is
// never trusted for state changes (per PayFast's own docs); it only ever
// triggers the frontend to re-poll GET /orders/:orderId/status.
//
// Responds 200 once a payload is understood but logically rejected
// (signature mismatch, failed re-validation, unmatched order) -- those will
// never succeed on retry, so acknowledging stops PayFast from retrying a
// notification that's never going anywhere. A genuine unexpected error
// (thrown, caught by asyncHandler -> the app's error middleware -> a 5xx)
// deliberately does NOT get swallowed to 200 here, since that's exactly the
// case where PayFast's own retry is useful -- a transient failure on our
// end should be retried once we recover, not silently dropped.
const receiveItn = asyncHandler(async (req, res) => {
  const fields = req.body; // parsed application/x-www-form-urlencoded, see payfastRoutes.js
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : '';

  if (!fields || !fields.m_payment_id) {
    return res.sendStatus(200); // malformed/empty -- nothing to process, don't retry it forever
  }

  if (!verifyItnSignature(fields)) {
    console.error('PayFast ITN: signature mismatch', fields.m_payment_id);
    return res.sendStatus(200);
  }

  const isValid = await revalidateWithPayfast(rawBody);
  if (!isValid) {
    console.error('PayFast ITN: server-to-server re-validation failed', fields.m_payment_id);
    return res.sendStatus(200);
  }

  const orderId = fields.m_payment_id;
  const gatewayReference = fields.pf_payment_id;
  const gatewayStatus = fields.payment_status; // e.g. 'COMPLETE'

  // Idempotency: a duplicate ITN for a reference already recorded as
  // COMPLETE is acknowledged without reprocessing -- payments.gateway_reference
  // has a unique index (014_payfast_checkout_and_review_queue.sql).
  const { data: existing } = await supabase
    .from('payments')
    .select('id, gateway_status')
    .eq('gateway_reference', gatewayReference)
    .maybeSingle();

  if (existing?.gateway_status === 'COMPLETE') {
    return res.sendStatus(200);
  }

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('id, order_number, status, total_amount, customer_id, users(email, phone)')
    .eq('id', orderId)
    .single();
  if (orderErr || !order) {
    console.error('PayFast ITN: order not found', orderId);
    return res.sendStatus(200);
  }

  const isComplete = gatewayStatus === 'COMPLETE' && Number(fields.amount_gross) >= Number(order.total_amount);

  const { error: upsertErr } = await supabase.from('payments').upsert(
    [
      {
        order_id: orderId,
        customer_id: order.customer_id,
        method: 'payfast',
        reference: gatewayReference,
        amount: fields.amount_gross || order.total_amount,
        gateway: 'payfast',
        gateway_reference: gatewayReference,
        gateway_status: gatewayStatus,
        // A verified, amount-matching gateway payment needs no manual admin
        // review -- that's the whole point of automating this path. Anything
        // else (pending/failed/short) is recorded for visibility only.
        status: isComplete ? 'approved' : 'submitted',
        verified_at: isComplete ? new Date().toISOString() : null,
      },
    ],
    { onConflict: 'gateway_reference' }
  );
  if (upsertErr) throw upsertErr;

  if (isComplete && order.status === 'stock_reserved') {
    const result = await transitionOrderStatus(orderId, 'confirmed');
    if (result.error) {
      console.error('PayFast ITN: could not transition order to confirmed:', result.error);
    } else {
      await notifyUser({
        userId: order.customer_id,
        type: 'order_status_changed',
        title: 'Payment confirmed',
        message: `Your payment for order #${order.order_number} was confirmed and your order is now being fulfilled.`,
        relatedType: 'order',
        relatedId: orderId,
        email: order.users?.email,
        phone: order.users?.phone,
      });
      await logActivity({
        actorLabel: 'PayFast (automated)',
        action: 'order.status_changed',
        entityType: 'order',
        entityId: orderId,
        description: `PayFast confirmed payment for order #${order.order_number}; status moved to "confirmed".`,
      });
    }
  }

  return res.sendStatus(200);
});

module.exports = { receiveItn };
