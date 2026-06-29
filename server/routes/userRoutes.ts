import express from 'express';
import { getDashboardOverview } from '../controllers/userController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/dashboard', protect as any, getDashboardOverview as any);

export default router;
