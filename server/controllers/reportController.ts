import { Response, NextFunction } from 'express';
import Report from '../models/Report.js';
import PdfService from '../services/report/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// @desc    Get all reports for authenticated user
// @route   GET /api/v1/reports
// @access  Private
export const getReports = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const query: any = { owner: req.user._id };
    
    // Support URL filtering if passed
    if (req.query.url) {
      query.url = { $regex: req.query.url as string, $options: 'i' };
    }

    const reports = await Report.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single report details
// @route   GET /api/v1/reports/:id
// @access  Private
export const getReportById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const report = await Report.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Performance report not found.' });
    }

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream PDF report download
// @route   GET /api/v1/reports/:id/pdf
// @access  Private
export const downloadPdf = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const report = await Report.findOne({ _id: req.params.id, owner: req.user._id });
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Performance report not found.' });
    }

    const pdfBuffer = await PdfService.generateReportPdf(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=perflens-report-${report.url.replace(/\./g, '-')}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
    
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a performance report
// @route   DELETE /api/v1/reports/:id
// @access  Private
export const deleteReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const report = await Report.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Performance report not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully from history.'
    });
  } catch (error) {
    next(error);
  }
};
