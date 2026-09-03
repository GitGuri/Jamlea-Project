// Standalone script, not an Express route -- meant to run as a Render Cron
// Job (a separate Render service type that runs a one-off command on a
// schedule) invoking `node src/jobs/releaseExpiredReservations.js` every
// few minutes. Deliberately not an in-process setInterval/node-cron: that
// would double-run once this app scales past one Render web instance,
// where a dedicated Cron Job service runs exactly once regardless of how
// many web instances exist.
//
// All the actual transactional work (restoring stock, deleting the
// reservation rows, cancelling the order) happens inside the
// release_expired_reservations() Postgres function
// (014_payfast_checkout_and_review_queue.sql) -- this script's only job is
// to call it and then send the customer notifications plpgsql can't send
// itself.

require('dotenv').config();
const supabase = require('../config/supabase');
const { notifyUser } = require('../services/notificationService');

async function run() {
  const { data: releasedOrderIds, error } = await supabase.rpc('release_expired_reservations');
  if (error) {
    console.error('release_expired_reservations failed:', error.message);
    process.exitCode = 1;
    return;
  }

  const orderIds = (releasedOrderIds || []).map((row) => row.order_id);
  if (orderIds.length === 0) {
    console.log('No expired reservations to release.');
    return;
  }

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, order_number, customer_id, users(email, phone)')
    .in('id', orderIds);
  if (ordersErr) {
    console.error('Reservations released, but could not load orders to notify:', ordersErr.message);
    process.exitCode = 1;
    return;
  }

  for (const order of orders) {
    await notifyUser({
      userId: order.customer_id,
      type: 'order_status_changed',
      title: 'Stock reservation expired',
      message: `Your reservation for order #${order.order_number} expired before payment was completed, so it's been cancelled and the stock released. Feel free to check out again if you still want it.`,
      relatedType: 'order',
      relatedId: order.id,
      email: order.users?.email,
      phone: order.users?.phone,
    });
  }

  console.log(`Released ${orderIds.length} expired reservation(s): ${orderIds.join(', ')}`);
}

// Only auto-runs when executed directly (`node src/jobs/releaseExpiredReservations.js`,
// what the Render Cron Job actually invokes) -- not when merely required.
// Without this guard, anything that requires() this module for an unrelated
// reason (a test importing it, a tool sweeping every file in src/ to sanity
// check requires) silently fires the job for real against production data
// as a side effect of loading it.
if (require.main === module) {
  // No process.exit() here on purpose: notifyUser's email/WhatsApp sends are
  // fire-and-forget (see notificationService.js) precisely because most
  // callers are long-running servers that don't need to wait on them -- but
  // this script is the one caller that's about to terminate on its own, so
  // forcing an immediate exit would kill those sends mid-flight before they
  // ever left the process. Setting exitCode and letting the event loop drain
  // naturally means Node only exits once every pending send has actually
  // settled.
  run()
    .then(() => {
      process.exitCode = process.exitCode || 0;
    })
    .catch((err) => {
      console.error('releaseExpiredReservations job crashed:', err);
      process.exitCode = 1;
    });
}

module.exports = { run };
