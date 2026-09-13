import dotenv from 'dotenv';
dotenv.config();

/**
 * Validates critical environment variables required for running in production.
 */
export const validateEnv = (): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const missingVars: string[] = [];

  if (isProd) {
    if (!process.env.JWT_SECRET) {
      missingVars.push('JWT_SECRET');
    }
    if (!process.env.SUPABASE_URL) {
      missingVars.push('SUPABASE_URL');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY) {
      missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    }
  } else {
    // Development/test environment checks (warn only)
    if (!process.env.JWT_SECRET) {
      console.warn('[Config Alert]: JWT_SECRET is not configured in .env. Falling back to development key.');
    }
    if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
      console.warn('[Config Alert]: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured. Add them to .env for persistence.');
    }
  }

  if (missingVars.length > 0) {
    console.error(`\n[FATAL CONFIG ERROR]: The following environment variables are missing in production:\n - ${missingVars.join('\n - ')}\n`);
    process.exit(1);
  }
};
export default validateEnv;
