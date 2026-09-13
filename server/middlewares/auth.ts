import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';
import { IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser | null;
}

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

// Authenticate JWT tokens
export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authorization token required.'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'perflens_developer_secret_key_88f910a2'
    ) as DecodedToken;

    // Attach decoded user info to request from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', decoded.id)
      .maybeSingle();

    if (!user || error) {
      return res.status(404).json({
        success: false,
        message: 'No active user found matching token credentials.'
      });
    }

    req.user = {
      _id: user.id,
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: new Date(user.created_at),
      created_at: user.created_at
    };

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Invalid or expired token.'
    });
  }
};

// Check user role permissions (e.g. admin actions)
export const authorize = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role unauthorized. Permissions restricted to: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Decode user tokens passively (allow guest fallbacks)
export const loadUserPassively = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'perflens_developer_secret_key_88f910a2'
    ) as DecodedToken;

    const { data: user } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .eq('id', decoded.id)
      .maybeSingle();

    if (user) {
      req.user = {
        _id: user.id,
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: new Date(user.created_at),
        created_at: user.created_at
      };
    }
  } catch {
    // Ignore decoding faults to allow guests
  }
  next();
};
