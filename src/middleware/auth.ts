import { NextFunction, Request, Response } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { supabase } from '../lib/supabase.ts';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  [key: string]: any;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser | DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing Bearer token' });
  }

  const token = authHeader.split('Bearer ')[1].trim();

  // 1. Try Supabase Auth verification if Supabase client is configured
  if (supabase) {
    try {
      const {
        data: { user: sbUser },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && sbUser) {
        req.user = {
          uid: sbUser.id,
          email: sbUser.email || `${sbUser.id}@medislot.local`,
          name:
            (sbUser.user_metadata?.full_name as string) ||
            (sbUser.user_metadata?.name as string) ||
            sbUser.email?.split('@')[0] ||
            'Patient',
          picture:
            (sbUser.user_metadata?.avatar_url as string) ||
            (sbUser.user_metadata?.picture as string) ||
            '',
          provider: 'supabase',
        };
        return next();
      }
    } catch {
      // Fall through to Firebase check
    }
  }

  // 2. Try Firebase ID token verification
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    return next();
  } catch (error: any) {
    console.error('Error verifying auth token:', error?.message || error);
    return res.status(401).json({
      error: 'Unauthorized: Invalid or expired token',
      details: 'Token could not be verified by Supabase or Firebase Auth.',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1].trim();

    // Check Supabase
    if (supabase) {
      try {
        const {
          data: { user: sbUser },
          error,
        } = await supabase.auth.getUser(token);
        if (!error && sbUser) {
          req.user = {
            uid: sbUser.id,
            email: sbUser.email || `${sbUser.id}@medislot.local`,
            name:
              (sbUser.user_metadata?.full_name as string) ||
              (sbUser.user_metadata?.name as string) ||
              sbUser.email?.split('@')[0] ||
              'Patient',
            picture:
              (sbUser.user_metadata?.avatar_url as string) ||
              (sbUser.user_metadata?.picture as string) ||
              '',
            provider: 'supabase',
          };
          return next();
        }
      } catch {
        // Fall through
      }
    }

    // Check Firebase
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      req.user = decodedToken;
    } catch {
      // Proceed unauthenticated for optional routes
    }
  }
  next();
};
