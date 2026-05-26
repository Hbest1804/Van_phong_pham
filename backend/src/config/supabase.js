import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * supabaseAnon  — dành cho các query không cần quyền admin
 * supabaseAdmin — dùng service_role key, bypass RLS, dùng trong backend
 */
export const supabaseAnon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
