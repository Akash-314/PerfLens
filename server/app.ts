import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import authRoutes from './routes/authRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import reportRoutes from './routes/report.routes.js';
import projectRoutes from './routes/projectRoutes.js';
import userRoutes from './routes/userRoutes.js';

import errorHandler from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';

const app = express();

// Security HTTP Headers
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// HTTP Request Logging
app.use(morgan('dev'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiter
app.use('/api', apiLimiter);

// API Health Check
app.get('/api/v1/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
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
      version: '1.0.0',
      description: 'API Documentation for PerfLens Frontend Performance Inspector backend.'
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local Development Server'
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

// Global Error Catch Middleware
app.use(errorHandler);

// Handle undefined routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Resource not found on endpoint: ${req.originalUrl}`
  });
});

export default app;
