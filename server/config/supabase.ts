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

export interface SupabaseStatusResult {
  connected: boolean;
  error?: string;
  isTableMissing?: boolean;
  durationMs?: number;
  timedOut?: boolean;
}

/**
 * Cleanly format errors coming from Supabase or upstream network gateways (like Cloudflare 521 HTML).
 */
export const sanitizeSupabaseError = (rawError: any): string => {
  if (!rawError) return 'Unknown query error';
  const message = typeof rawError === 'string' ? rawError : (rawError.message || String(rawError));

  if (message.includes('521') || message.includes('Web server is down')) {
    return 'Supabase service unreachable (Cloudflare Error 521: Web server is down). If your free project was paused due to inactivity, restore it from the Supabase Dashboard.';
  }

  if (message.includes('<!DOCTYPE') || message.includes('<html') || message.includes('cf-error-details')) {
    const titleMatch = message.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Gateway returned HTML error';
    return `Supabase service unreachable (${title}). Project may be paused or offline.`;
  }

  return message;
};

/**
 * Detailed health check helper testing active connectivity with Supabase.
 */
export const checkSupabaseConnectionDetailed = async (timeoutMs: number = 8000): Promise<SupabaseStatusResult> => {
  if (!isSupabaseConfigured()) {
    return { connected: false, error: 'Supabase credentials not configured' };
  }
  const startTime = Date.now();
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeoutPromise = new Promise<SupabaseStatusResult>((resolve) => {
      timer = setTimeout(() => {
        resolve({ connected: false, timedOut: true, error: `Connection timed out after ${timeoutMs}ms` });
      }, timeoutMs);
    });

    const queryPromise = Promise.resolve(
      supabase
        .from('users')
        .select('id')
        .limit(1)
    )
      .then(({ error }) => {
        if (timer) clearTimeout(timer);
        if (error) {
          const isTableMissing =
            error.code === '42P01' ||
            error.code === 'PGRST204' ||
            error.message?.includes('does not exist') ||
            error.message?.includes('schema cache');
          return {
            connected: false,
            error: sanitizeSupabaseError(error.message),
            isTableMissing,
            durationMs: Date.now() - startTime
          };
        }
        return { connected: true, durationMs: Date.now() - startTime };
      })
      .catch((err: any) => {
        if (timer) clearTimeout(timer);
        return {
          connected: false,
          error: sanitizeSupabaseError(err?.message || 'Network query failed'),
          durationMs: Date.now() - startTime
        };
      });

    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    return { connected: false, error: sanitizeSupabaseError(err?.message || 'Unknown error') };
  }
};

/**
 * Health check helper to test active connectivity with Supabase.
 */
export const checkSupabaseConnection = async (timeoutMs: number = 8000): Promise<boolean> => {
  const result = await checkSupabaseConnectionDetailed(timeoutMs);
  return result.connected;
};

export default supabase;
