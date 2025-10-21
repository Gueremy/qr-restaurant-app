import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const roleAuth = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        res.status(401).json({ message: 'No token provided' });
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.active) {
        res.status(401).json({ message: 'User not found or inactive' });
        return;
      }

      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      (req as any).user = {
        id: user.id,
        email: user.email,
        role: user.role
      };

      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
      return;
    }
  };
};

// Specific role middleware functions
export const requireAdmin = roleAuth(['admin']);
export const requireAdminOrManager = roleAuth(['admin', 'manager']);
export const requireKitchenAccess = roleAuth(['admin', 'manager', 'kitchen']);
export const requireWaiterAccess = roleAuth(['admin', 'manager', 'waiter']);

// Export requireRole for backward compatibility
export const requireRole = roleAuth;