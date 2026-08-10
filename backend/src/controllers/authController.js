const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');

// Public self-registration always creates a 'customer' account. Staff accounts
// (sales_rep/admin) are created separately by an existing admin via createStaffUser,
// so this endpoint can never be used to self-grant elevated access.
const register = asyncHandler(async (req, res) => {
  const { email, password, company_name } = req.body;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { company_name: company_name || null, role: 'customer' },
  });

  if (error) return res.status(400).json({ error: error.message });

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, company_name, role')
    .eq('id', data.user.id)
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });

  return res.status(201).json({ message: 'User created successfully', user: profile });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Use a throwaway client here, not the shared `supabase` -- see the
  // warning in config/supabase.js for why signing in on the shared instance
  // is unsafe.
  const { data, error } = await supabase.createScopedClient().auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, company_name, role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'User profile not found' });
  }

  return res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    user: profile,
  });
});

const getMe = asyncHandler(async (req, res) => {
  return res.json({ user: req.user });
});

// Admin-only: creates a sales_rep or admin account.
const createStaffUser = asyncHandler(async (req, res) => {
  const { email, password, company_name, role } = req.body;

  if (!['sales_rep', 'admin'].includes(role)) {
    return res.status(400).json({ error: "Role must be 'sales_rep' or 'admin'." });
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { company_name: company_name || null, role },
  });

  if (error) return res.status(400).json({ error: error.message });

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, company_name, role')
    .eq('id', data.user.id)
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });

  return res.status(201).json({ message: 'Staff user created successfully', user: profile });
});

module.exports = { register, login, getMe, createStaffUser };
