import { Response, NextFunction } from 'express';
import Report from '../models/Report.js';
import Project from '../models/Project.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// @desc    Get user dashboard summary metrics
// @route   GET /api/v1/users/dashboard
// @access  Private
export const getDashboardOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user._id;

    // Fetch total user reports count & latest 5 reports
    const reportsCount = await Report.countDocuments({ owner: userId });
    const recentReports = await Report.find({ owner: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('url scores createdAt');

    // Fetch total project count
    const projectsCount = await Project.countDocuments({ owner: userId });

    res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.createdAt
        },
        stats: {
          reportsCount,
          projectsCount
        },
        recentReports
      }
    });
  } catch (error) {
    next(error);
  }
};
