import express from 'express';
import { saveReport, getReports, getReportById, deleteReport } from '../controllers/report.controller.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Enforce authentication for all endpoints in this router
router.use(protect as any);

router.post('/', saveReport as any);
router.get('/', getReports as any);
router.get('/:id', getReportById as any);
router.delete('/:id', deleteReport as any);

export default router;
