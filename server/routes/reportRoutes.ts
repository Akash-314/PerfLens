import express from 'express';
import { getReports, getReportById, downloadPdf, deleteReport } from '../controllers/reportController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect as any);

router.get('/', getReports as any);
router.get('/:id', getReportById as any);
router.get('/:id/pdf', downloadPdf as any);
router.delete('/:id', deleteReport as any);

export default router;
