import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { hashPassword, comparePassword } from '../models/User.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';

// Helper to sign JWT access token
const generateToken = (id: string): string => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'perflens_developer_secret_key_88f910a2',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Database service is unconfigured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const { data: userExists } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email address already registered.' });
    }

    const hashedPassword = await hashPassword(password);
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user'
      })
      .select('id, email, role, created_at')
      .single();

    if (insertError || !user) {
      throw new Error(insertError?.message || 'Failed to create user record in Supabase.');
    }

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      data: {
        _id: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      success: false,
      message: 'Database service is unconfigured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.'
    });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password, role, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error || !user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Password incorrect.' });
    }

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      data: {
        _id: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/me
// @access  Private
export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};
