import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// @desc    Get all workspace projects
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user.id || req.user._id;

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const formattedProjects = (projects || []).map(p => ({
      _id: p.id,
      id: p.id,
      name: p.name,
      websites: p.websites || [],
      owner: p.owner_id,
      team: p.team || [],
      createdAt: p.created_at,
      created_at: p.created_at
    }));

    res.status(200).json({
      success: true,
      count: formattedProjects.length,
      data: formattedProjects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project workspace
// @route   POST /api/v1/projects
// @access  Private
export const createProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { name, websites } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user.id || req.user._id;

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: name.trim(),
        websites: websites || [],
        owner_id: userId,
        team: ['You (Owner)']
      })
      .select('*')
      .single();

    if (error || !project) {
      throw new Error(error?.message || 'Failed to create project in Supabase.');
    }

    const formatted = {
      _id: project.id,
      id: project.id,
      name: project.name,
      websites: project.websites || [],
      owner: project.owner_id,
      team: project.team || [],
      createdAt: project.created_at,
      created_at: project.created_at
    };

    res.status(201).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add domain to project
// @route   POST /api/v1/projects/:id/websites
// @access  Private
export const addWebsiteToProject = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { website } = req.body;

  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user.id || req.user._id;
    const projectId = req.params.id;

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error || !project) {
      return res.status(404).json({ success: false, message: 'Project workspace not found.' });
    }

    const cleanWebsite = website.trim();
    const existingWebsites: string[] = project.websites || [];

    if (existingWebsites.includes(cleanWebsite)) {
      return res.status(400).json({ success: false, message: 'Domain already tracked in project.' });
    }

    const updatedWebsites = [...existingWebsites, cleanWebsite];

    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({ websites: updatedWebsites })
      .eq('id', projectId)
      .select('*')
      .single();

    if (updateError || !updatedProject) {
      throw new Error(updateError?.message || 'Failed to update project websites.');
    }

    const formatted = {
      _id: updatedProject.id,
      id: updatedProject.id,
      name: updatedProject.name,
      websites: updatedProject.websites || [],
      owner: updatedProject.owner_id,
      team: updatedProject.team || [],
      createdAt: updatedProject.created_at,
      created_at: updatedProject.created_at
    };

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance trends aggregate
// @route   GET /api/v1/projects/:id/history
// @access  Private
export const getProjectHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user.id || req.user._id;
    const projectId = req.params.id;

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('owner_id', userId)
      .maybeSingle();

    if (error || !project) {
      return res.status(404).json({ success: false, message: 'Project workspace not found.' });
    }

    const trackedDomains = project.websites || [];
    if (trackedDomains.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Fetch previous reports matching project websites
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('id, url, scores, created_at')
      .eq('owner_id', userId)
      .in('url', trackedDomains)
      .order('created_at', { ascending: true });

    if (reportsError) {
      throw new Error(reportsError.message);
    }

    const formattedReports = (reports || []).map(r => ({
      _id: r.id,
      id: r.id,
      url: r.url,
      scores: r.scores,
      createdAt: r.created_at,
      created_at: r.created_at
    }));

    res.status(200).json({
      success: true,
      data: formattedReports
    });
  } catch (error) {
    next(error);
  }
};
