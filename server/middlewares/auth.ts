import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User.js';

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

    // Attach decoded user info to request
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'No active user found matching token credentials.'
      });
    }

    next();
  } catch (error) {
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
    req.user = await User.findById(decoded.id).select('-password');
  } catch (_) {
    // Ignore decoding faults to allow guests
  }
  next();
};
