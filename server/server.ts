import app from './app.js';
import connectDatabase from './config/database.js';
import validateEnv from './config/envValidator.js';
import dotenv from 'dotenv';

dotenv.config();

// Validate Environment Variables
validateEnv();

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`[PerfLens Server]: Backend API active at http://localhost:${PORT}`);
  console.log(`[PerfLens Server]: Frontend UI running at http://localhost:5173`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[PerfLens Server Error]: Port ${PORT} is already in use by another process.`);
    console.error(`[PerfLens Resolution]: Stop previous running servers or run 'npx kill-port ${PORT}'\n`);
    process.exit(1);
  } else {
    console.error(`[PerfLens Server Error]: ${err.message}`);
  }
});

// Clean shutdown on Ctrl+C to instantly free the port for next startup
const gracefulShutdown = () => {
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 1000).unref();
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Verify Supabase Database Connection in background so port is active immediately
connectDatabase();

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
