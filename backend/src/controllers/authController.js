const supabase = require('../config/supabase');
const asyncHandler = require('../utils/asyncHandler');
const { notifyUser, notifyInternalTeam, sendEmail } = require('../services/notificationService');

// Public self-registration. Defaults to a 'customer' account (immediate
// access, unchanged from before). Requesting 'sales_rep' instead lands the
// account as 'pending' -- it can't log in until an admin approves it via
// reviewStaffSignupAdmin. 'admin' can never be requested here; an admin can
// promote an approved sales_rep later if needed.
const register = asyncHandler(async (req, res) => {
  const { email, password, company_name, full_name, role } = req.body;
  const requestedRole = role || 'customer';

  if (!['customer', 'sales_rep'].includes(requestedRole)) {
    return res.status(400).json({ error: "Role must be 'customer' or 'sales_rep'." });
  }
  if (requestedRole === 'sales_rep' && !full_name) {
    return res.status(400).json({ error: 'Full name is required for a staff signup.' });
  }

  const status = requestedRole === 'sales_rep' ? 'pending' : 'approved';

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { company_name: company_name || null, full_name: full_name || null, role: requestedRole },
  });

  if (error) return res.status(400).json({ error: error.message });

  // A DB trigger normally creates this row from the auth user's metadata,
  // but relying on it alone is a race: if this SELECT runs before the
  // trigger commits, registration fails with the auth account already
  // created and no profile to show for it -- an orphaned account that can
  // neither register again (email taken) nor log in (no profile). Upserting
  // here directly makes registration correct regardless of trigger timing.
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .upsert(
      {
        id: data.user.id,
        email,
        company_name: company_name || null,
        full_name: full_name || null,
        role: requestedRole,
        status,
      },
      { onConflict: 'id' }
    )
    .select('id, email, company_name, full_name, role, status')
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });

  if (status === 'pending') {
    await notifyInternalTeam({
      type: 'general',
      title: 'New staff signup request',
      message: `${full_name} (${email}) has requested a sales_rep account and is awaiting approval.`,
      relatedType: 'staff_signup',
      relatedId: profile.id,
    });

    return res.status(201).json({
      message: 'Your signup request has been submitted for admin approval.',
      pending: true,
    });
  }

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
    .select('id, email, company_name, role, status')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    return res.status(500).json({ error: 'User profile not found' });
  }

  if (profile.status === 'pending') {
    return res.status(403).json({ error: 'Your account is awaiting admin approval.' });
  }
  if (profile.status === 'rejected') {
    return res.status(403).json({ error: 'Your signup request was not approved.' });
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

// Admin only: every pending staff signup request.
const getPendingStaffAdmin = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, role, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return res.json(data);
});

// Admin only. A signup can only be reviewed once -- already approved/rejected
// requests are final here (same guard shape as paymentController.js's
// updatePaymentStatus).
const reviewStaffSignupAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'." });
  }

  const { data: target, error: findErr } = await supabase
    .from('users')
    .select('id, email, full_name, status')
    .eq('id', id)
    .single();

  if (findErr || !target) return res.status(404).json({ error: 'Signup request not found' });

  if (target.status !== 'pending') {
    return res.status(400).json({ error: `This request is already "${target.status}" and can't be reviewed again.` });
  }

  const { error } = await supabase.from('users').update({ status }).eq('id', id);
  if (error) throw error;

  if (status === 'approved') {
    await notifyUser({
      userId: target.id,
      type: 'general',
      title: 'Account approved',
      message: 'Your staff account has been approved. You can now log in to the Customer Portal.',
      relatedType: 'staff_signup',
      relatedId: id,
      email: target.email,
    });
  } else {
    // Rejected accounts can never log in, so an in-app notification would
    // never be seen -- email is the only channel that reaches them.
    await sendEmail(
      target.email,
      'Signup request not approved',
      'Your request for a staff account was not approved. Contact us if you have questions.'
    );
  }

  return res.json({ message: 'Signup request updated', id, status });
});

module.exports = { register, login, getMe, getPendingStaffAdmin, reviewStaffSignupAdmin };
