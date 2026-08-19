const supabase = require('../../config/supabase');
const { sendList, sendText, sendButtons } = require('../../config/whatsapp');
const { formatCurrency } = require('../../utils/formatCurrency');
const { submitPaymentForCustomer } = require('../paymentService');

const METHOD_BUTTONS = [
  { id: 'payment_method_bank_transfer', title: 'Bank transfer/EFT' },
  { id: 'payment_method_other', title: 'Other' },
];

const REVIEW_BUTTONS = [
  { id: 'payment_confirm_submit', title: 'Confirm & submit' },
  { id: 'payment_start_over', title: 'Start over' },
  { id: 'payment_cancel', title: 'Cancel' },
];

async function start(conversation) {
  const { phone, user_id } = conversation;

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, order_number, total_amount, created_at, payments(status)')
    .eq('customer_id', user_id)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10); // list cap -- most recent 10, same simplification as quote picking

  if (error) {
    await sendText(phone, 'Sorry, something went wrong loading your orders. Try again shortly.');
    return { newState: 'main_menu', newContext: {} };
  }

  // An order with a payment already submitted/approved isn't payable again
  // -- same rule submitPaymentForCustomer enforces, filtered here too so it
  // never even shows up in the picker.
  const payable = (orders || []).filter(
    (o) => !o.payments?.some((p) => p.status === 'submitted' || p.status === 'approved')
  );

  if (!payable.length) {
    await sendText(phone, "You don't have any approved orders awaiting payment right now.");
    const { sendMenu } = require('./mainMenu');
    await sendMenu(phone);
    return { newState: 'main_menu', newContext: {} };
  }

  await sendList(phone, {
    header: 'Your orders',
    body: 'Pick an order to submit a payment for:',
    buttonText: 'Orders',
    sections: [
      {
        title: 'Approved orders',
        rows: payable.map((o) => ({
          id: `pay_order_${o.id}`,
          title: `Order #${o.order_number}`,
          description: `${formatCurrency(o.total_amount)} · ${new Date(o.created_at).toLocaleDateString()}`,
        })),
      },
    ],
  });

  return { newState: 'payment_selecting_order', newContext: {} };
}

async function sendReview(phone, context) {
  await sendButtons(phone, {
    body:
      `Order #${context.orderNumber}\n` +
      `Method: ${context.methodLabel}\n` +
      `Reference: ${context.reference}\n` +
      `Amount: ${formatCurrency(context.amount)}\n\n` +
      `Submit this payment for review?`,
    buttons: REVIEW_BUTTONS,
  });

  return { newState: 'payment_reviewing', newContext: context };
}

async function handleConfirmSubmit(conversation, context) {
  const { phone } = conversation;

  // Same atomic-claim pattern as orderConversion.js's handleConfirmConvert
  // -- a slow response can lead to more than one tap on the same button.
  // Only the request that wins this update proceeds.
  const { data: claimed } = await supabase
    .from('whatsapp_conversations')
    .update({ state: 'payment_submitting' })
    .eq('id', conversation.id)
    .eq('state', 'payment_reviewing')
    .select('id')
    .maybeSingle();

  if (!claimed) {
    return {}; // lost the race -- leave state/context untouched, send nothing
  }

  const { data: customer } = await supabase
    .from('users')
    .select('email, company_name')
    .eq('id', conversation.user_id)
    .single();
  const customerLabel = customer?.company_name || customer?.email || 'A WhatsApp customer';

  const result = await submitPaymentForCustomer(
    conversation.user_id,
    customerLabel,
    { orderId: context.orderId, method: context.method, reference: context.reference, amount: context.amount },
    'whatsapp'
  );

  if (result.error) {
    await sendText(phone, `Couldn't submit that payment: ${result.error}`);
    return { newState: 'main_menu', newContext: {} };
  }

  await sendText(
    phone,
    `✅ Payment submitted for order #${result.orderNumber}! Our team will review it against our bank statement and confirm shortly.`
  );
  const { sendMenu } = require('./mainMenu');
  await sendMenu(phone);
  return { newState: 'main_menu', newContext: {} };
}

async function handle(conversation, message) {
  const { phone, state, context } = conversation;
  const choice = message.interactiveId;
  const text = (message.text || '').trim();

  if (state === 'payment_selecting_order') {
    if (!choice || !choice.startsWith('pay_order_')) {
      await sendText(phone, 'Please pick an order from the list, or reply "menu" to go back.');
      return { newState: 'payment_selecting_order', newContext: {} };
    }

    const orderId = choice.slice('pay_order_'.length);
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number')
      .eq('id', orderId)
      .eq('customer_id', conversation.user_id)
      .eq('status', 'approved')
      .maybeSingle();

    if (!order) {
      await sendText(phone, "Sorry, that order isn't available anymore.");
      return { newState: 'main_menu', newContext: {} };
    }

    await sendButtons(phone, {
      body: `Order #${order.order_number}\n\nHow did you pay?`,
      buttons: METHOD_BUTTONS,
    });
    return {
      newState: 'payment_awaiting_method',
      newContext: { orderId: order.id, orderNumber: order.order_number },
    };
  }

  if (state === 'payment_awaiting_method') {
    if (choice !== 'payment_method_bank_transfer' && choice !== 'payment_method_other') {
      await sendText(phone, 'Please choose a payment method from the buttons above.');
      return { newState: 'payment_awaiting_method', newContext: context };
    }

    const method = choice === 'payment_method_bank_transfer' ? 'bank_transfer' : 'other';
    const methodLabel = choice === 'payment_method_bank_transfer' ? 'Bank transfer/EFT' : 'Other';
    await sendText(phone, 'What is the reference number from your bank/payment (e.g. the transaction reference)?');
    return {
      newState: 'payment_awaiting_reference',
      newContext: { ...context, method, methodLabel },
    };
  }

  if (state === 'payment_awaiting_reference') {
    if (!text) {
      await sendText(phone, 'Please reply with the reference number for your payment.');
      return { newState: 'payment_awaiting_reference', newContext: context };
    }

    await sendText(phone, 'How much did you pay? (e.g. 1250.00)');
    return {
      newState: 'payment_awaiting_amount',
      newContext: { ...context, reference: text },
    };
  }

  if (state === 'payment_awaiting_amount') {
    const amount = Number(text.replace(/[^0-9.]/g, ''));
    if (!text || !Number.isFinite(amount) || amount <= 0) {
      await sendText(phone, "That doesn't look like a valid amount. Please reply with just the number, e.g. 1250.00");
      return { newState: 'payment_awaiting_amount', newContext: context };
    }

    return sendReview(phone, { ...context, amount });
  }

  if (state === 'payment_reviewing') {
    if (choice === 'payment_confirm_submit') {
      return handleConfirmSubmit(conversation, context);
    }

    if (choice === 'payment_start_over') {
      await sendText(phone, 'No problem, let\'s start over.');
      return start(conversation);
    }

    if (choice === 'payment_cancel') {
      await sendText(phone, 'No problem.');
      const { sendMenu } = require('./mainMenu');
      await sendMenu(phone);
      return { newState: 'main_menu', newContext: {} };
    }

    return sendReview(phone, context);
  }

  const { sendMenu } = require('./mainMenu');
  await sendMenu(phone);
  return { newState: 'main_menu', newContext: {} };
}

module.exports = { start, handle };
