import { Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import ReportGenerator from '../services/analysis/index.js';
import Report from '../models/Report.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// Helper to normalize host prefixes
const normalizeUrl = (url: string): string => {
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  }
  return clean;
};

// @desc    Analyze website and compile report
// @route   POST /api/v1/analysis/scan
// @access  Optional Private (Guests allowed)
export const scanWebsite = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { url } = req.body;
  const targetUrl = normalizeUrl(url);

  console.log(`[Analysis Controller]: Starting concurrent scan pipelines for: ${targetUrl}`);

  try {
    const startTime = Date.now();

    const reportData = await ReportGenerator.generate(
      targetUrl, 
      req.user ? req.user._id.toString() : null
    );
    const report = await Report.create(reportData);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Analysis Controller]: Scan successfully processed for ${report.url} in ${duration}s. Report ID: ${report._id}`);

    res.status(211).json({
      success: true,
      duration: `${duration}s`,
      data: report
    });

  } catch (error) {
    next(error);
  }
};
