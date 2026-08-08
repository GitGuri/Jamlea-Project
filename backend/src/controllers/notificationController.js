const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

const getMyNotifications = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return res.json(data);
});

const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Notification not found' });
  return res.json(data);
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', req.user.id)
    .eq('is_read', false);

  if (error) throw error;
  return res.json({ message: 'All notifications marked as read' });
});

module.exports = { getMyNotifications, markAsRead, markAllAsRead };
