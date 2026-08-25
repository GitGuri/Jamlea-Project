const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser } = require('../services/notificationService');
const { submitPaymentForCustomer } = require('../services/paymentService');

// Customer: submit a bank-transfer/EFT proof of payment against one of their
// own approved orders. There's no payment gateway here -- staff manually
// cross-check the reference against their bank statement and approve/reject.
//
// Staff (admin/sales_rep) can also submit a payment on a customer's behalf
// -- same idea as the staff branch in quoteController.js's
// convertQuoteToOrder -- so the customer is resolved from the order itself
// instead of assuming req.user is the customer.
const createPayment = asyncHandler(async (req, res) => {
  const { order_id, method, reference, amount, note } = req.body;
  const isStaff = ['admin', 'sales_rep'].includes(req.user.role);

  let customerId = req.user.id;
  let customerLabel = req.user.company_name || req.user.email;

  if (isStaff) {
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('customer_id, users(email, company_name)')
      .eq('id', order_id)
      .single();
    if (orderErr || !order) return res.status(404).json({ error: 'Order not found' });

    customerId = order.customer_id;
    customerLabel = order.users?.company_name || order.users?.email || customerLabel;
  }

  const result = await submitPaymentForCustomer(
    customerId,
    customerLabel,
    { orderId: order_id, method, reference, amount, note },
    isStaff ? 'admin' : 'portal'
  );
  if (result.error) return res.status(result.status).json({ error: result.error });

  return res.status(201).json({ message: 'Payment submitted successfully', ...result });
});

// Admin/sales_rep only: every submitted payment across all customers.
const getAllPaymentsAdmin = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, orders(id, total_amount), users!payments_customer_id_fkey(email, company_name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json(data);
});

// Admin/sales_rep only. Only a 'submitted' payment can be approved/rejected
// -- once reviewed, it's final (a rejected payment can be resubmitted as a
// new row via createPayment instead of being reopened here).
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
  }

  const { data: payment, error: findErr } = await supabase
    .from('payments')
    .select('id, status, customer_id, order_id, users!payments_customer_id_fkey(email)')
    .eq('id', id)
    .single();

  if (findErr || !payment) return res.status(404).json({ error: 'Payment not found' });

  if (payment.status !== 'submitted') {
    return res.status(400).json({ error: `Payment is already "${payment.status}" and can't be reviewed again.` });
  }

  const { error } = await supabase
    .from('payments')
    .update({ status, reviewed_by: req.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  if (status === 'approved') {
    await notifyUser({
      userId: payment.customer_id,
      type: 'general',
      title: 'Payment approved',
      message: `Your payment for order ${payment.order_id} has been approved. Thank you!`,
      relatedType: 'payment',
      relatedId: id,
      email: payment.users?.email,
    });
  }

  return res.json({ message: 'Payment status updated', paymentId: id, status });
});

module.exports = { createPayment, getAllPaymentsAdmin, updatePaymentStatus };
