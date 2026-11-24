import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env';
import { User } from '../models/User';
import { normalizeServiceDomains, type OwnerServiceDomain } from '../utils/service-domain';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

const env = getEnv();

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    // Prefer Bearer token from Authorization header, fall back to httpOnly cookie.
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      token = req.cookies?.accessToken;
    }
    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required', message: 'Token manquant.' });
      return;
    }
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; role: string };
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token', message: 'Token invalide ou expiré.' });
  }
};

/**
 * Optional authentication for public endpoints: returns the user id when a valid Bearer token
 * (or access cookie) is present, undefined otherwise. Never rejects the request.
 */
export function optionalUserId(req: Request): string | undefined {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.accessToken;
    if (!token) return undefined;
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId?: string };
    return typeof decoded.userId === 'string' ? decoded.userId : undefined;
  } catch {
    return undefined;
  }
}

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.userRole !== 'ADMIN') {
    res.status(403).json({ success: false, error: 'Admin access required', message: 'Accès administrateur requis.' });
    return;
  }
  next();
};

export const requireRoles =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Permissions insuffisantes.' });
      return;
    }
    next();
  };

export const requireEstablishmentOwner = requireRoles('ESTABLISHMENT_OWNER', 'ADMIN');

export const requireAnyServiceDomains =
  (...domains: OwnerServiceDomain[]) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (req.userRole === 'ADMIN') return next();
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Authentication required', message: 'Utilisateur non authentifie.' });
      return;
    }
    const user = await User.findById(req.userId).select('serviceDomains role').lean();
    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required', message: 'Utilisateur introuvable.' });
      return;
    }
    if ((user as any).role === 'ORGANIZER') return next();
    const ownedDomains = normalizeServiceDomains((user as any).serviceDomains);
    if (!ownedDomains.some((d) => domains.includes(d))) {
      res.status(403).json({ success: false, error: 'Forbidden', message: 'Domaine de service non autorise.' });
      return;
    }
    next();
  };
