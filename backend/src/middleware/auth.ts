import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Extender el tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      ApiResponseUtil.unauthorized(res, 'Token de acceso requerido');
      return;
    }

    // Permitir tokens demo para desarrollo
    if (token.startsWith('demo-token-')) {
      const roleMatch = token.match(/demo-token-(\w+)-/);
      const role = roleMatch ? roleMatch[1].toUpperCase() : 'WAITER';
      
      // Crear usuario demo basado en el token
      req.user = {
        userId: `demo-user-${role.toLowerCase()}`,
        email: `${role.toLowerCase()}@demo.com`,
        role: role,
      };
      
      next();
      return;
    }

    // Verificar el token JWT normal
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    // Buscar el usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!user) {
      ApiResponseUtil.unauthorized(res, 'Usuario no encontrado');
      return;
    }

    if (!user.active) {
      ApiResponseUtil.unauthorized(res, 'Usuario inactivo');
      return;
    }

    // Agregar información del usuario al request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      ApiResponseUtil.unauthorized(res, 'Token inválido');
    } else if (error instanceof jwt.TokenExpiredError) {
      ApiResponseUtil.unauthorized(res, 'Token expirado');
    } else {
      console.error('Error en autenticación:', error);
      ApiResponseUtil.error(res, 'Error interno del servidor', 500);
    }
  }
};

// Middleware para verificar roles específicos
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponseUtil.unauthorized(res, 'Usuario no autenticado');
      return;
    }

    if (!roles.includes(req.user.role)) {
      ApiResponseUtil.forbidden(res, 'Permisos insuficientes');
      return;
    }

    next();
  };
};

// Middlewares específicos para roles comunes
export const requireAdmin = requireRole(['ADMIN']);
export const requireManager = requireRole(['ADMIN', 'MANAGER']);
export const requireStaff = requireRole(['ADMIN', 'WAITER', 'KITCHEN']);