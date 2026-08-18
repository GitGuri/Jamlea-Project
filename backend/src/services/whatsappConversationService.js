const supabase = require('../config/supabase');

// WhatsApp's own `from` field arrives as digits only, country code included,
// no leading '+' or '0' (e.g. a South African number is "27821234567", not
// "+27821234567" or "0821234567"). Portal-entered numbers get normalized to
// that same shape so lookups compare like-for-like.
//
// This is a pragmatic normalizer, not full international phone parsing --
// it strips everything to digits but can't infer a missing country code
// from a local-format number (a leading 0 with no country code). The portal
// UI asks people to include their country code to avoid that gap.
function normalizePhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return digits || null;
}

async function getOrCreateConversation(rawPhone) {
  const phone = normalizePhone(rawPhone);

  const { data: existing, error: findErr } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: created, error: createErr } = await supabase
    .from('whatsapp_conversations')
    .insert([{ phone }])
    .select()
    .single();

  if (createErr) throw createErr;
  return created;
}

async function updateConversation(id, { state, context, userId } = {}) {
  const patch = { updated_at: new Date().toISOString() };
  if (state !== undefined) patch.state = state;
  if (context !== undefined) patch.context = context;
  if (userId !== undefined) patch.user_id = userId;

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Looks an already-linked account up by phone -- used both for WhatsApp's
// own "is this a known number" check and by the portal's register/profile
// endpoints to reject a phone already claimed by another account.
async function findUserByPhone(rawPhone) {
  const phone = normalizePhone(rawPhone);
  if (!phone) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, company_name, role, status')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;
  return data;
}

module.exports = { normalizePhone, getOrCreateConversation, updateConversation, findUserByPhone };
