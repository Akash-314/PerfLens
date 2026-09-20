import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { isSupabaseConfigured, checkSupabaseConnection } from './config/supabase.js';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import authRoutes from './routes/authRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import reportRoutes from './routes/report.routes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

const app = express();
// Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS Configuration - environment-driven with safe fallback
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP Request Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Body parser with explicit limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter
app.use('/api', apiLimiter);

// API Health Check
app.get('/api/v1/health', async (req: Request, res: Response) => {
  let dbStatus = 'unconfigured';
  if (isSupabaseConfigured()) {
    const isConnected = await checkSupabaseConnection();
    dbStatus = isConnected ? 'connected' : 'disconnected';
  }
  res.status(200).json({
    success: true,
    message: 'PerfLens API Server running smoothly',
    timestamp: new Date(),
    database: dbStatus
  });
});

// Swagger OpenAPI documentation configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PerfLens API Documentation',
      version: '2.0.0',
      description: 'API Documentation for PerfLens Frontend Performance Inspector backend.'
    },
    servers: [
      {
        url: process.env.API_URL || '/api/v1',
        description: process.env.NODE_ENV === 'production' ? 'Production Gateway' : 'Development Gateway'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js', './controllers/*.js', './routes/*.ts', './controllers/*.ts']
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve as any, swaggerUi.setup(swaggerDocs) as any);

// Connect Versioned API Routers
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/ai', aiRoutes);

app.get("/", (_req, res) => {
  res.send("PerfLens API Gateway Active");
});

app.get("/hello", (_req, res) => {
  res.send("HELLO");
});

// Handle undefined routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Resource not found on endpoint: ${req.originalUrl}`
  });
});

// Global Error Catch Middleware (must be last)
app.use(errorHandler);

export default app;
