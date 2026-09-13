import { isSupabaseConfigured, checkSupabaseConnection } from './supabase.js';

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
    const isConnected = await checkSupabaseConnection();
    if (isConnected) {
      console.log('✅ Supabase PostgreSQL Database Connected successfully.');
    } else {
      console.warn('⚠️ Supabase reached but failed querying users table. Please ensure supabase_schema.sql has been executed.');
    }
  } catch (error: any) {
    console.error(`Supabase Connection Error: ${error.message}`);
    console.warn('Backend will run, but database operations may fail without Supabase active.');
  }
};

export default connectDatabase;
