import { Request, Response, NextFunction } from 'express';

/**
 * Express error handling gateway
 */
const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err };
  error.message = err.message;

  // Log error console summary
  console.error(`[Error Handler]: ${err.name || 'System Error'} - ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const message = 'Duplicate field value entered. Record already exists.';
    return res.status(409).json({ success: false, message });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
    return res.status(422).json({ success: false, message });
  }

  // Mongoose bad ObjectId format
  if (err.name === 'CastError') {
    const message = 'Resource not found. Invalid identifier format.';
    return res.status(404).json({ success: false, message });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal Server Error. Please contact support.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

export default errorHandler;
