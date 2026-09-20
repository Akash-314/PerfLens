import express from 'express';
import {
  explainFindingController,
  getAiStatusController,
  getAiConfigController,
  saveAiConfigController,
  deleteAiKeyController,
  testAiConnectionController
} from '../controllers/aiController.js';
import { protect, loadUserPassively } from '../middlewares/auth.js';

const router = express.Router();

// Explanation endpoint: supports authenticated user configs and passive guest fallback
router.post('/explain', loadUserPassively, explainFindingController);

// Status check endpoint
router.get('/status', getAiStatusController);

// User AI configuration management (requires authentication)
router.get('/config', protect, getAiConfigController);
router.put('/config', protect, saveAiConfigController);
router.delete('/config/key', protect, deleteAiKeyController);
router.post('/test-connection', protect, testAiConnectionController);

export default router;
