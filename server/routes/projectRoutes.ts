import express from 'express';
import { getProjects, createProject, addWebsiteToProject, getProjectHistory } from '../controllers/projectController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect as any);

router.get('/', getProjects as any);
router.post('/', createProject as any);
router.post('/:id/websites', addWebsiteToProject as any);
router.get('/:id/history', getProjectHistory as any);

export default router;
