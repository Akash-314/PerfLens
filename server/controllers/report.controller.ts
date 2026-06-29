import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import * as reportService from '../services/report/index.js';

/**
 * @desc    Save a new consolidated performance report
 * @route   POST /api/v1/reports
 * @access  Private
 */
export const saveReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const { url, analysisResult } = req.body;
    if (!url || !analysisResult) {
      return res.status(400).json({
        success: false,
        message: 'Target website URL and analysisResult payload are required.'
      });
    }

    const report = await reportService.saveReport(req.user._id.toString(), url, analysisResult);

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reports for authenticated user
 * @route   GET /api/v1/reports
 * @access  Private
 */
export const getReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const reports = await reportService.getReportsByUser(req.user._id.toString());

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single report details
 * @route   GET /api/v1/reports/:id
 * @access  Private
 */
export const getReportById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const id = req.params.id as string;
    try {
      const report = await reportService.getReport(id, req.user._id.toString());
      res.status(200).json({
        success: true,
        data: report
      });
    } catch (error: any) {
      if (error.message === 'Invalid ID') {
        return res.status(400).json({ success: false, message: 'Invalid report ID format.' });
      }
      if (error.message === 'Missing Report') {
        return res.status(404).json({ success: false, message: 'Performance report not found.' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a performance report
 * @route   DELETE /api/v1/reports/:id
 * @access  Private
 */
export const deleteReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const id = req.params.id as string;
    try {
      await reportService.deleteReport(id, req.user._id.toString());
      res.status(200).json({
        success: true,
        message: 'Report deleted successfully from history.'
      });
    } catch (error: any) {
      if (error.message === 'Invalid ID') {
        return res.status(400).json({ success: false, message: 'Invalid report ID format.' });
      }
      if (error.message === 'Missing Report') {
        return res.status(404).json({ success: false, message: 'Performance report not found.' });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
};
