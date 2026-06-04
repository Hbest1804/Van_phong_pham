import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * supabaseAnon  — dành cho các query không cần quyền admin
 * supabaseAdmin — dùng service_role key, bypass RLS, dùng trong backend
 *
 * realtime: { enabled: false } — Backend không dùng Supabase Realtime.
 * Tắt để tránh lỗi WebSocket trên Node.js 20 (native WS chỉ có từ Node 22).
 */

const SHARED_OPTIONS = {
  realtime: { enabled: false },
  global: { fetch: globalThis.fetch },
};

export const supabaseAnon = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  SHARED_OPTIONS,
);

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    ...SHARED_OPTIONS,
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
