const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

// Service-role client: used server-side only, bypasses RLS, also used to
// manage accounts (auth.admin.*). Never call auth.signInWithPassword() or
// auth.setSession() on this instance -- doing so swaps its in-memory session
// in, which then overrides the Authorization header on every subsequent
// .from()/.rpc() call made through this same shared client (for every
// request handled by the process, not just the caller's), silently
// downgrading privileged writes from service_role to that user's own role
// and tripping RLS. Use createScopedClient() for anything that signs in.
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

supabase.createScopedClient = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

module.exports = supabase;
