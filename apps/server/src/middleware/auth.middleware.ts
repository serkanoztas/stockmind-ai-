import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './error.middleware';
import { prisma } from '../lib/prisma';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      businessId?: string;
      userRole?: 'OWNER' | 'MANAGER' | 'STAFF';
    }
  }
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication token missing or invalid');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; email: string };
    req.user = { id: payload.userId, email: payload.email };
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
};

export const requireBusinessAccess = (
  allowedRoles: Array<'OWNER' | 'MANAGER' | 'STAFF'> = ['OWNER', 'MANAGER', 'STAFF']
) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const businessId = (req.headers['x-business-id'] as string) || req.params.businessId;

    if (!businessId) {
      throw new AppError(400, 'Business context header (x-business-id) is required');
    }

    if (!req.user) {
      throw new AppError(401, 'User context missing');
    }

    const membership = await prisma.businessMember.findUnique({
      where: {
        userId_businessId: {
          userId: req.user.id,
          businessId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, 'Access denied to this business workspace');
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new AppError(403, 'Insufficient permissions for this action');
    }

    req.businessId = businessId;
    req.userRole = membership.role;
    next();
  };
};