const { friendlyRpcErrorMessage } = require('../rpcErrorMessage');

describe('friendlyRpcErrorMessage', () => {
  it('maps the real approve_order/cancel_order exception texts (backend/sql/003_order_stock_management.sql)', () => {
    expect(friendlyRpcErrorMessage('Order 3f9e1234-... not found')).toBe('Order not found.');
    expect(
      friendlyRpcErrorMessage('Order 3f9e1234-... is not pending approval (current status: approved)')
    ).toBe('This order is no longer awaiting approval.');
    expect(
      friendlyRpcErrorMessage('Insufficient stock for product 3f9e1234-... (have 2, need 5)')
    ).toBe("There isn't enough stock to approve this order.");
    expect(
      friendlyRpcErrorMessage('Order 3f9e1234-... cannot be cancelled from status completed')
    ).toBe("This order can't be cancelled from its current status.");
  });

  it('maps the real checkout_quote_with_reservation exception texts (backend/sql/014_payfast_checkout_and_review_queue.sql)', () => {
    expect(friendlyRpcErrorMessage('Quote 3f9e1234-... not found for this customer')).toBe('Quote not found.');
    expect(friendlyRpcErrorMessage('Quote is not submitted (status: converted)')).toBe(
      'This quote has already been converted to an order.'
    );
    expect(friendlyRpcErrorMessage('Quote is not submitted (status: expired)')).toBe('This quote has expired.');
    expect(friendlyRpcErrorMessage('Quote is not submitted (status: draft)')).toBe(
      "This quote hasn't been submitted yet."
    );
  });

  it('falls back to a generic message for an unrecognized error, rather than leaking raw text', () => {
    expect(friendlyRpcErrorMessage('invalid input syntax for type uuid: "not-a-uuid"')).toBe(
      'Something went wrong. Please try again.'
    );
    expect(friendlyRpcErrorMessage('')).toBe('Something went wrong. Please try again.');
    expect(friendlyRpcErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
