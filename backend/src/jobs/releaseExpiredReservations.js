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
    .select('id, order_number, customer_id, users(email)')
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
    });
  }

  console.log(`Released ${orderIds.length} expired reservation(s): ${orderIds.join(', ')}`);
}

run()
  .then(() => process.exit(process.exitCode || 0))
  .catch((err) => {
    console.error('releaseExpiredReservations job crashed:', err);
    process.exit(1);
  });
