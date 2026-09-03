const supabase = require('../config/supabase');
const { PROFILE_FIELDS } = require('../utils/userProfileFields');

// Verifies the Supabase Auth access token sent as "Authorization: Bearer <token>"
// and attaches the caller's profile (id, email, role, company_name) to req.user.
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing access token' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(PROFILE_FIELDS)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    // Catches a status change taking effect mid-session (e.g. a rejection
    // after the account already holds a valid token), not just at the next
    // login -- login() only checks status at sign-in time.
    if (profile.status !== 'approved') {
      return res.status(403).json({ error: 'Your account is not active.' });
    }

    req.user = profile;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, requireRole };
