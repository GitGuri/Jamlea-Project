const supabase = require('../config/supabase');

// Single source of truth for orders.status, per the additive PayFast/review-
// queue design: every write to this column -- the existing admin manual
// update, the new PayFast webhook, the reservation-expiry job, and the
// admin-review resolve endpoint -- goes through transitionOrderStatus()
// instead of each doing its own supabase.from('orders').update({status}).
//
// Merges the existing manual-approval transitions (previously only defined
// as ORDER_TRANSITIONS in orderController.js) with the new fast-checkout
// ones. 'stock_reserved' has no entry in the *admin-settable* sense --
// nothing here stops a caller from requesting it, but nothing in the app
// ever calls transitionOrderStatus with 'stock_reserved' as a target either;
// it's only ever set directly by checkout_quote_with_reservation() at order
// creation time, not transitioned into later.
const ORDER_TRANSITIONS = {
  pending_approval: ['approved', 'cancelled'],
  approved: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled'],
  stock_reserved: ['confirmed', 'cancelled'],
  confirmed: ['ready_for_collection', 'cancelled'],
  ready_for_collection: [],
  completed: [],
  cancelled: [],
};

function allowedNextStatuses(currentStatus) {
  return ORDER_TRANSITIONS[currentStatus] || [];
}

// Plain update -- callers that need the atomic stock-managing RPCs
// (approve_order/cancel_order, checkout_quote_with_reservation,
// release_expired_reservations) call those directly for the transition that
// also touches stock, then nothing else needs to also call this function for
// the same change. This function is for every *other* status write, so
// there's exactly one place that enforces "is this transition even legal".
async function transitionOrderStatus(orderId, newStatus) {
  const { data: order, error: findErr } = await supabase
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .single();

  if (findErr || !order) return { error: 'Order not found', status: 404 };

  if (!allowedNextStatuses(order.status).includes(newStatus)) {
    return { error: `Cannot move order from "${order.status}" to "${newStatus}".`, status: 400 };
  }

  const { data: updated, error } = await supabase
    .from('orders')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return { order: updated };
}

module.exports = { transitionOrderStatus, allowedNextStatuses, ORDER_TRANSITIONS };
