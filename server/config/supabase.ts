import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
if (!process.env.SUPABASE_URL) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseUrl.includes('your-project-ref') &&
    !supabaseKey.includes('placeholder') &&
    !supabaseKey.includes('your-supabase-service-role-secret-key')
  );
};

// Gracefully handle unconfigured credentials during initial developer setup
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Health check helper to test active connectivity with Supabase.
 */
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }
  try {
    const timeoutPromise = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000));
    const queryPromise = Promise.resolve(
      supabase
        .from('users')
        .select('id')
        .limit(1)
    )
      .then(({ error }) => !error)
      .catch(() => false);

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch {
    return false;
  }
};

export default supabase;
