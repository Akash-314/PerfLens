import rateLimit from 'express-rate-limit';

// Standard rate limiter for global APIs
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: 'Too many API requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limiter for authentication logins
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit login attempts to 20 per hour
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Limit intensive scan operations
export const scanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // Limit CPU intensive crawler scans to 30 per hour
  message: {
    success: false,
    message: 'Scan limit hit for this hour. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
