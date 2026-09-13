import app from './app.js';
import connectDatabase from './config/database.js';
import validateEnv from './config/envValidator.js';
import dotenv from 'dotenv';

dotenv.config();

// Validate Environment Variables
validateEnv();

const PORT = process.env.PORT || 5001;

// Verify Supabase Database Connection
connectDatabase();

app.listen(PORT, () => {
  console.log(`[PerfLens Server]: Web application backend active in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}.`);
});

// Capture global promise rejections
process.on('unhandledRejection', (err: any) => {
  console.error(`[Unhandled Rejection Fault]: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
});

// Capture uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error(`[Uncaught Exception Fault]: ${err.message}`);
  process.exit(1);
});
