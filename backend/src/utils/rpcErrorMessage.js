// Postgres RPC functions (approve_order/cancel_order/checkout_quote_with_
// reservation -- see backend/sql/003_order_stock_management.sql and
// 014_payfast_checkout_and_review_queue.sql) raise plain-text exceptions
// meant for a developer reading logs, not a customer/admin reading a UI --
// they include raw UUIDs and internal enum values (e.g. "Order 3f9e...-...
// cannot be cancelled from status pending_approval"). errorHandler.js's own
// stated design is to never leak that kind of internal text to a response;
// callers that catch an RPC error and return it directly (rather than
// throwing and letting errorHandler.js genericize it) need to translate it
// first. This maps the small, known set of messages those specific RPCs can
// raise into the same friendly wording the equivalent JS-side checks
// already use elsewhere (e.g. quoteService.js's convertQuoteForCustomer).
//
// Anything that doesn't match a known pattern falls back to a generic
// message rather than forwarding the raw text -- a new/unrecognized RPC
// exception should get a vague-but-safe response, not a leak.
function friendlyRpcErrorMessage(rawMessage) {
  if (!rawMessage) return 'Something went wrong. Please try again.';

  if (/^Order .* not found$/.test(rawMessage)) {
    return 'Order not found.';
  }
  if (/^Order .* is not pending approval/.test(rawMessage)) {
    return 'This order is no longer awaiting approval.';
  }
  if (/^Insufficient stock for product/.test(rawMessage)) {
    return "There isn't enough stock to approve this order.";
  }
  if (/^Order .* cannot be cancelled from status/.test(rawMessage)) {
    return "This order can't be cancelled from its current status.";
  }
  if (/^Quote .* not found for this customer$/.test(rawMessage)) {
    return 'Quote not found.';
  }
  const notSubmittedMatch = rawMessage.match(/^Quote is not submitted \(status: (\w+)\)$/);
  if (notSubmittedMatch) {
    const status = notSubmittedMatch[1];
    if (status === 'converted') return 'This quote has already been converted to an order.';
    if (status === 'expired') return 'This quote has expired.';
    return "This quote hasn't been submitted yet.";
  }

  return 'Something went wrong. Please try again.';
}

module.exports = { friendlyRpcErrorMessage };
