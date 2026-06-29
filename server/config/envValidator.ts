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
    if (!process.env.MONGODB_URI) {
      missingVars.push('MONGODB_URI');
    }
  } else {
    // Development/test environment checks (warn only)
    if (!process.env.JWT_SECRET) {
      console.warn('[Config Alert]: JWT_SECRET is not configured in .env. Falling back to development key.');
    }
    if (!process.env.MONGODB_URI) {
      console.warn('[Config Alert]: MONGODB_URI is not configured. Falling back to local instance.');
    }
  }

  if (missingVars.length > 0) {
    console.error(`\n[FATAL CONFIG ERROR]: The following environment variables are missing in production:\n - ${missingVars.join('\n - ')}\n`);
    process.exit(1);
  }
};
export default validateEnv;
