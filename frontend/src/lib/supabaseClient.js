import { createClient } from '@supabase/supabase-js';

// The only place this app's frontend talks to Supabase directly -- every
// other request goes through our own backend, which holds the service-role
// key. Google Sign-In can't work that way: the browser itself has to redirect
// to Google's consent screen and back, which only Supabase's client SDK can
// drive. This client exists solely to kick off that redirect and read back
// the resulting session on /auth/callback.
//
// persistSession is off on purpose -- this app already manages its own
// access_token/refresh_token in localStorage (see AuthContext), matching
// what the backend's own /auth/login issues. Letting this client *also*
// persist a session would mean two separate, unsynchronized token stores.
// detectSessionInUrl stays on since that's what actually parses the
// redirect back from Google/Supabase into a usable session.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
});

export default supabase;
