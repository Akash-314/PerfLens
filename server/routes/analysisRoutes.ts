import express from 'express';
import { scanWebsite } from '../controllers/analysisController.js';
import { scanValidator } from '../validators/analysisValidator.js';
import { loadUserPassively } from '../middlewares/auth.js';
import { scanLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/scan', scanLimiter, loadUserPassively as any, scanValidator, scanWebsite as any);

export default router;
