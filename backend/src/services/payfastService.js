// PayFast integration: builds the signed checkout fields the frontend posts
// the browser to, and verifies/re-validates an incoming ITN (Instant
// Transaction Notification) webhook. Per PayFast's ITN documentation, the
// browser's return_url redirect is NEVER trusted for state changes -- only
// this server-to-server notify path is, after both the signature check and
// the mandatory re-validation call below succeed.
//
// NOTE: this is structurally complete against PayFast's documented
// algorithm, but hasn't been exercised against PayFast's actual servers --
// that needs real PAYFAST_MERCHANT_ID/PAYFAST_MERCHANT_KEY/PAYFAST_PASSPHRASE
// in .env, which weren't available while this was built.

const crypto = require('crypto');

function isSandbox() {
  return (process.env.PAYFAST_MODE || 'sandbox') !== 'live';
}

function checkoutUrl() {
  return isSandbox() ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process';
}

function validateUrl() {
  return isSandbox()
    ? 'https://sandbox.payfast.co.za/eng/query/validate'
    : 'https://www.payfast.co.za/eng/query/validate';
}

// PayFast's signature: URL-encode each value the way PayFast expects
// (spaces as '+', via encodeURIComponent + a small fixup, matching their
// PHP-originated examples), concatenate as key=value&key=value in the exact
// field order given, append the passphrase, MD5 hash the result. The field
// order matters -- it's not a sorted/canonical order, it's "the order you
// built the object in", so callers must pass fields in the order PayFast's
// docs specify.
function payfastEncode(value) {
  return encodeURIComponent(String(value).trim()).replace(/%20/g, '+');
}

function computeSignature(fields, passphrase) {
  const pairs = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${payfastEncode(value)}`);

  if (passphrase) {
    pairs.push(`passphrase=${payfastEncode(passphrase)}`);
  }

  return crypto.createHash('md5').update(pairs.join('&')).digest('hex');
}

// order/customer -> the signed field set + the URL to auto-post the browser
// to. Field order follows PayFast's own documented example order.
function buildCheckoutFields(order, customer) {
  const fields = {
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    return_url: process.env.PAYFAST_RETURN_URL,
    cancel_url: process.env.PAYFAST_CANCEL_URL,
    notify_url: `${process.env.BACKEND_URL || ''}/api/payments/payfast/notify`,
    name_first: customer.company_name || customer.email,
    email_address: customer.email,
    m_payment_id: order.id,
    amount: Number(order.total_amount).toFixed(2),
    item_name: `Order #${order.order_number}`,
  };

  const signature = computeSignature(fields, process.env.PAYFAST_PASSPHRASE);

  return { action: checkoutUrl(), fields: { ...fields, signature } };
}

// rawFields: the posted ITN body as a plain object (field order preserved --
// see payfastWebhookController.js for how it's parsed). Compares against the
// posted `signature` field, which is excluded from the recomputation.
function verifyItnSignature(rawFields) {
  const { signature, ...rest } = rawFields;
  if (!signature) return false;

  const expected = computeSignature(rest, process.env.PAYFAST_PASSPHRASE);

  // TEMPORARY DEBUG -- remove once the live ITN signature mismatch is
  // diagnosed. Logs exactly what PayFast posted and what we computed from
  // it, since guessing at settings pages we can't see isn't converging.
  console.log('PAYFAST ITN DEBUG fields received:', JSON.stringify(rest));
  console.log('PAYFAST ITN DEBUG signature received:', signature);
  console.log('PAYFAST ITN DEBUG signature expected:', expected);

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false; // length mismatch -- definitely not equal
  }
}

// The required server-to-server re-validation: PayFast expects the exact
// raw posted body echoed back to their validate endpoint, and only a
// response body of exactly "VALID" is trusted.
async function revalidateWithPayfast(rawBody) {
  try {
    const res = await fetch(validateUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rawBody,
    });
    const text = (await res.text()).trim();
    return text === 'VALID';
  } catch (err) {
    console.error('PayFast re-validation request failed:', err.message);
    return false;
  }
}

module.exports = { buildCheckoutFields, verifyItnSignature, revalidateWithPayfast, isSandbox };
