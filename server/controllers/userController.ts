import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// @desc    Get user dashboard summary metrics
// @route   GET /api/v1/users/dashboard
// @access  Private
export const getDashboardOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user.id || req.user._id;

    // Fetch total user reports count
    const { count: reportsCount } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    // Fetch latest 5 reports
    const { data: recentReportsData } = await supabase
      .from('reports')
      .select('id, url, scores, created_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const recentReports = (recentReportsData || []).map(r => ({
      _id: r.id,
      id: r.id,
      url: r.url,
      scores: r.scores,
      createdAt: r.created_at,
      created_at: r.created_at
    }));

    // Fetch total project count
    const { count: projectsCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', userId);

    res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: req.user.id || req.user._id,
          id: req.user.id || req.user._id,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.createdAt || req.user.created_at
        },
        stats: {
          reportsCount: reportsCount || 0,
          projectsCount: projectsCount || 0
        },
        recentReports
      }
    });
  } catch (error) {
    next(error);
  }
};
