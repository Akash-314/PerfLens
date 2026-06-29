import app from './app.js';
import connectDatabase from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDatabase();

const server = app.listen(PORT, () => {
  console.log(`[PerfLens Server]: Web application backend active in ${process.env.NODE_ENV || 'development'} mode.`);
  console.log(`[PerfLens Server]: API Gateway: http://localhost:${PORT}/api/v1`);
  console.log(`[PerfLens Server]: OpenAPI Swagger Docs: http://localhost:${PORT}/api/docs`);
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
