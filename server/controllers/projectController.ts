import { Response, NextFunction } from 'express';
import Project from '../models/Project.js';
import Report from '../models/Report.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// @desc    Get all workspace projects
// @route   GET /api/v1/projects
// @access  Private
export const getProjects = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const projects = await Project.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
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

    const project = await Project.create({
      name,
      websites: websites || [],
      owner: req.user._id,
      team: ['You (Owner)']
    });

    res.status(211).json({
      success: true,
      data: project
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

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project workspace not found.' });
    }

    if (project.websites.includes(website.trim())) {
      return res.status(400).json({ success: false, message: 'Domain already tracked in project.' });
    }

    project.websites.push(website.trim());
    await project.save();

    res.status(200).json({
      success: true,
      data: project
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

    const project = await Project.findOne({ _id: req.params.id, owner: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project workspace not found.' });
    }

    // Fetch previous reports matching project websites
    const reports = await Report.find({
      owner: req.user._id,
      url: { $in: project.websites }
    })
    .sort({ createdAt: 1 })
    .select('url scores createdAt');

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    next(error);
  }
};
