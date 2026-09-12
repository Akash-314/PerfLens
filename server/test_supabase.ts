import dotenv from 'dotenv';
dotenv.config();

import { supabase, isSupabaseConfigured } from './config/supabase.js';

async function verify() {
  console.log('--- SUPABASE CONFIGURATION TEST ---');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Is Configured:', isSupabaseConfigured());

  try {
    const { error: userError } = await supabase.from('users').select('*').limit(1);
    console.log('users table:', userError ? `❌ FAILED: ${userError.message}` : '✅ OK (Table exists)');

    const { error: projectError } = await supabase.from('projects').select('*').limit(1);
    console.log('projects table:', projectError ? `❌ FAILED: ${projectError.message}` : '✅ OK (Table exists)');

    const { error: reportError } = await supabase.from('reports').select('*').limit(1);
    console.log('reports table:', reportError ? `❌ FAILED: ${reportError.message}` : '✅ OK (Table exists)');

    const { error: compError } = await supabase.from('saved_comparisons').select('*').limit(1);
    console.log('saved_comparisons table:', compError ? `❌ FAILED: ${compError.message}` : '✅ OK (Table exists)');
  } catch (err: any) {
    console.error('Fatal Test Exception:', err.message);
  }
}

verify();
