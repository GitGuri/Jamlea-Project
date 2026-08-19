// Thin wrapper around Meta's WhatsApp Cloud API (Graph API "messages" edge).
// Every send function returns the parsed Graph API response; callers only
// need to await them, errors are logged here rather than duplicated at each
// call site since a failed WhatsApp send should never crash a webhook reply.

const GRAPH_VERSION = 'v20.0';

function apiUrl() {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
}

function mediaUrl() {
  return `https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`;
}

async function send(payload) {
  try {
    const res = await fetch(apiUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
    });
    const data = await res.json();
    if (!res.ok) console.error('WhatsApp send failed:', JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('WhatsApp send error:', err.message);
    return null;
  }
}

function sendText(to, body) {
  return send({ to, type: 'text', text: { body } });
}

// sections: [{ title, rows: [{ id, title, description }] }] -- Meta caps
// interactive lists at 10 rows total across all sections, and each row's
// `id` is what comes back in the user's reply, so callers can encode
// whatever they need to identify the choice (a product id, "next_page", etc).
function sendList(to, { header, body, footer, buttonText, sections }) {
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(header ? { header: { type: 'text', text: header } } : {}),
      body: { text: body },
      ...(footer ? { footer: { text: footer } } : {}),
      action: { button: buttonText || 'Choose', sections },
    },
  });
}

// buttons: [{ id, title }] -- Meta caps reply buttons at 3.
function sendButtons(to, { body, buttons }) {
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

// Meta can't attach a file the way email does -- a document first has to be
// uploaded to Meta's own Media endpoint (getting back a media id), then a
// document *message* references that id. Uses Node's built-in FormData/Blob
// (global since Node 18) rather than a new dependency.
async function uploadMedia(buffer, filename, mimeType) {
  try {
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', new Blob([buffer], { type: mimeType }), filename);

    const res = await fetch(mediaUrl(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('WhatsApp media upload failed:', JSON.stringify(data));
      return null;
    }
    return data.id;
  } catch (err) {
    console.error('WhatsApp media upload error:', err.message);
    return null;
  }
}

function sendDocument(to, mediaId, filename, caption) {
  return send({
    to,
    type: 'document',
    document: { id: mediaId, filename, ...(caption ? { caption } : {}) },
  });
}

module.exports = { sendText, sendList, sendButtons, uploadMedia, sendDocument };
