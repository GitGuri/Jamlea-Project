const supabase = require('../../config/supabase');
const { sendList, sendText } = require('../../config/whatsapp');
const { formatCurrency } = require('../../utils/formatCurrency');
const { convertQuoteForCustomer } = require('../quoteService');

async function start(conversation) {
  const { phone, user_id } = conversation;

  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, total_amount, created_at')
    .eq('customer_id', user_id)
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })
    .limit(10); // list cap -- most recent 10, same simplification as category browsing

  if (error) {
    await sendText(phone, 'Sorry, something went wrong loading your quotes. Try again shortly.');
    return { newState: 'main_menu', newContext: {} };
  }
  if (!quotes.length) {
    await sendText(phone, "You don't have any saved quotes yet -- pick \"Create a quotation\" from the menu first.");
    const { sendMenu } = require('./mainMenu');
    await sendMenu(phone);
    return { newState: 'main_menu', newContext: {} };
  }

  await sendList(phone, {
    header: 'Your quotes',
    body: 'Pick a quote to convert into an order:',
    buttonText: 'Quotes',
    sections: [
      {
        title: 'Submitted quotes',
        rows: quotes.map((q) => ({
          id: `quote_${q.id}`,
          title: `Quote #${q.id.slice(0, 8)}`,
          description: `${formatCurrency(q.total_amount)} · ${new Date(q.created_at).toLocaleDateString()}`,
        })),
      },
    ],
  });

  return { newState: 'order_selecting_quote', newContext: {} };
}

async function handle(conversation, message) {
  const { phone } = conversation;
  const choice = message.interactiveId;

  if (!choice || !choice.startsWith('quote_')) {
    await sendText(phone, 'Please pick a quote from the list, or reply "menu" to go back.');
    return { newState: 'order_selecting_quote', newContext: {} };
  }

  const quoteId = choice.slice('quote_'.length);

  const { data: customer } = await supabase
    .from('users')
    .select('email, company_name')
    .eq('id', conversation.user_id)
    .single();
  const customerLabel = customer?.company_name || customer?.email || 'A WhatsApp customer';

  const result = await convertQuoteForCustomer(conversation.user_id, customerLabel, quoteId, 'whatsapp');

  if (result.error) {
    await sendText(phone, `Couldn't convert that quote: ${result.error}`);
    return { newState: 'main_menu', newContext: {} };
  }

  await sendText(
    phone,
    `✅ Order placed! Your order still needs to be approved by our team before payment -- we'll let you know as soon as that happens.`
  );
  const { sendMenu } = require('./mainMenu');
  await sendMenu(phone);
  return { newState: 'main_menu', newContext: {} };
}

module.exports = { start, handle };
