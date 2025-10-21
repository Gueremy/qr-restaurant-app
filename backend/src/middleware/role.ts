import { Request, Response, NextFunction } from 'express';
import { ApiResponseUtil } from '../utils/response';

/**
 * Middleware para verificar roles de usuario
 * @param allowedRoles - Array de roles permitidos
 * @returns Middleware function
 */
export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
};

/**
 * Middleware para verificar si el usuario es ADMIN
 */
export const requireAdmin = roleMiddleware(['ADMIN']);

/**
 * Middleware para verificar si el usuario es ADMIN o MANAGER
 */
export const requireAdminOrManager = roleMiddleware(['ADMIN', 'MANAGER']);

/**
 * Middleware para verificar si el usuario es ADMIN, MANAGER o KITCHEN
 */
export const requireKitchenAccess = roleMiddleware(['ADMIN', 'MANAGER', 'KITCHEN']);

/**
 * Middleware para verificar si el usuario es ADMIN, MANAGER o WAITER
 */
export const requireWaiterAccess = roleMiddleware(['ADMIN', 'MANAGER', 'WAITER']);