const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
}

// Service-role client: used server-side only, bypasses RLS, also used to
// verify user access tokens (auth.getUser) and manage accounts (auth.admin.*).
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
