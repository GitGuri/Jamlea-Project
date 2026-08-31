const supabase = require('../config/supabase');

// Fire-and-forget on purpose: a logging failure must never break the real
// action it's recording (approving an order, resolving a review, etc.).
// Every call site awaits this for ordering, but errors are swallowed here
// (and surfaced to the server log) instead of thrown.
async function logActivity({ actorId = null, actorLabel, action, entityType = null, entityId = null, description }) {
  const { error } = await supabase.from('activity_log').insert([
    { actor_id: actorId, actor_label: actorLabel, action, entity_type: entityType, entity_id: entityId, description },
  ]);
  if (error) console.error('activityLog insert failed:', error.message);
}

// Admin only (enforced at the route) -- paginated, newest first.
async function listActivity({ page = 1, limit = 50 } = {}) {
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const from = (pageNum - 1) * limitNum;
  const to = from + limitNum - 1;

  const { data, error, count } = await supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return { data, page: pageNum, limit: limitNum, total: count };
}

module.exports = { logActivity, listActivity };
