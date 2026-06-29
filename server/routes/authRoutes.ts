import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import { registerValidator, loginValidator } from '../validators/authValidator.js';
import { protect } from '../middlewares/auth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, registerValidator, register as any);
router.post('/login', authLimiter, loginValidator, login as any);
router.get('/me', protect as any, getMe as any);

export default router;
