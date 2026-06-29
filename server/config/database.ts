import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Orchestrate database connection hook
 */
const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/perflens';
    console.log(`Connecting to MongoDB at: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`);

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.warn('Backend will run, but database operations may fail without MongoDB running.');
  }
};

export default connectDatabase;
