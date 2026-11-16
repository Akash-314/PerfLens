import { isSupabaseConfigured, checkSupabaseConnectionDetailed } from './supabase.js';

/**
 * Orchestrate database connection verification for Supabase.
 */
const connectDatabase = async (): Promise<void> => {
  if (!isSupabaseConfigured()) {
    console.warn('[Supabase Alert]: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in .env.');
    console.warn('[Supabase Alert]: Backend will run in ephemeral guest mode. Add Supabase keys to persist data.');
    return;
  }

  try {
    const status = await checkSupabaseConnectionDetailed(8000);
    if (status.connected) {
      console.log(`✅ Supabase PostgreSQL Database Connected successfully (${status.durationMs}ms).`);
    } else if (status.isTableMissing) {
      console.warn(`⚠️ Supabase reached, but table 'users' does not exist in schema (${status.error}).`);
      console.warn('   Please execute server/supabase_schema.sql in your Supabase SQL Editor.');
    } else if (status.timedOut) {
      console.warn(`⚠️ Supabase connection check timed out: ${status.error}`);
      console.warn('   The server will continue, but Supabase network operations may experience latency.');
    } else {
      console.warn(`⚠️ Supabase connection check error: ${status.error || 'Unknown query error'}`);
    }
  } catch (error: any) {
    console.error(`Supabase Connection Error: ${error.message}`);
    console.warn('Backend will run, but database operations may fail without Supabase active.');
  }
};

export default connectDatabase;
