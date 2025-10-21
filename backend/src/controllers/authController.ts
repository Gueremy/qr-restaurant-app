import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiResponseUtil } from '../utils/response';
import { LoginSchema } from '../types';

const prisma = new PrismaClient();

export class AuthController {
  // POST /api/auth/login - Login con redirección por roles
  static async login(req: Request, res: Response) {
    try {
      const validatedData = LoginSchema.parse(req.body);
      const { username, password } = validatedData;

      // Buscar usuario por nombre (username)
      const user = await prisma.user.findFirst({
        where: { name: username },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          active: true
        }
      });

      if (!user) {
        return ApiResponseUtil.error(res, 'Invalid credentials', 401);
      }

      if (!user.active) {
        return ApiResponseUtil.error(res, 'Account is deactivated', 401);
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return ApiResponseUtil.error(res, 'Invalid credentials', 401);
      }

      // Generar token JWT
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role 
        },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      // Determinar redirección según el rol
      const redirectPath = AuthController.getRedirectPath(user.role);

      // Respuesta sin incluir la contraseña
      const { password: _, ...userWithoutPassword } = user;

      return ApiResponseUtil.success(res, {
        user: userWithoutPassword,
        token,
        redirectPath,
        expiresIn: '24h'
      }, 'Login successful');

    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ZodError') {
        return ApiResponseUtil.error(res, 'Invalid input data', 400);
      }
      return ApiResponseUtil.serverError(res, 'Login failed');
    }
  }

  // POST /api/auth/logout - Logout (invalidar token del lado cliente)
  static async logout(req: Request, res: Response) {
    try {
      // En una implementación más robusta, aquí se podría mantener una blacklist de tokens
      return ApiResponseUtil.success(res, null, 'Logout successful');
    } catch (error) {
      console.error('Logout error:', error);
      return ApiResponseUtil.serverError(res, 'Logout failed');
    }
  }

  // GET /api/auth/me - Obtener información del usuario actual
  static async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return ApiResponseUtil.error(res, 'User not authenticated', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true
        }
      });

      if (!user) {
        return ApiResponseUtil.error(res, 'User not found', 404);
      }

      if (!user.active) {
        return ApiResponseUtil.error(res, 'Account is deactivated', 401);
      }

      const redirectPath = AuthController.getRedirectPath(user.role);

      return ApiResponseUtil.success(res, {
        user,
        redirectPath
      }, 'User information retrieved successfully');

    } catch (error) {
      console.error('Get current user error:', error);
      return ApiResponseUtil.serverError(res, 'Failed to get user information');
    }
  }

  // POST /api/auth/change-password - Cambiar contraseña
  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const { currentPassword, newPassword } = req.body;

      if (!userId) {
        return ApiResponseUtil.error(res, 'User not authenticated', 401);
      }

      if (!currentPassword || !newPassword) {
        return ApiResponseUtil.error(res, 'Current password and new password are required', 400);
      }

      if (newPassword.length < 6) {
        return ApiResponseUtil.error(res, 'New password must be at least 6 characters long', 400);
      }

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true }
      });

      if (!user) {
        return ApiResponseUtil.error(res, 'User not found', 404);
      }

      // Verificar contraseña actual
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        return ApiResponseUtil.error(res, 'Current password is incorrect', 400);
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar contraseña
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      });

      return ApiResponseUtil.success(res, null, 'Password changed successfully');

    } catch (error) {
      console.error('Change password error:', error);
      return ApiResponseUtil.serverError(res, 'Failed to change password');
    }
  }

  // Método privado para determinar la ruta de redirección según el rol
  private static getRedirectPath(role: string): string {
    switch (role) {
      case 'ADMIN':
        return '/admin/dashboard';
      case 'MANAGER':
        return '/admin/dashboard';
      case 'WAITER':
        return '/waiter/dashboard';
      case 'KITCHEN':
        return '/kitchen/dashboard';
      case 'CUSTOMER':
        return '/customer/menu';
      default:
        return '/';
    }
  }

  // GET /api/auth/roles - Obtener roles disponibles (solo para admins)
  static async getRoles(req: Request, res: Response) {
    try {
      const userRole = (req as any).user?.role;

      if (userRole !== 'ADMIN') {
        return ApiResponseUtil.error(res, 'Access denied', 403);
      }

      const roles = [
        { value: 'ADMIN', label: 'Administrador', description: 'Acceso completo al sistema' },
        { value: 'MANAGER', label: 'Gerente', description: 'Gestión de reportes y configuración' },
        { value: 'WAITER', label: 'Camarero', description: 'Gestión de pedidos y mesas' },
        { value: 'KITCHEN', label: 'Chef', description: 'Gestión de preparación de pedidos' },
        { value: 'CUSTOMER', label: 'Cliente', description: 'Acceso al menú y pedidos' }
      ];

      return ApiResponseUtil.success(res, roles, 'Roles retrieved successfully');

    } catch (error) {
      console.error('Get roles error:', error);
      return ApiResponseUtil.serverError(res, 'Failed to get roles');
    }
  }

  // POST /api/auth/validate-token - Validar token JWT
  static async validateToken(req: Request, res: Response) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');

      if (!token) {
        return ApiResponseUtil.error(res, 'No token provided', 401);
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      // Verificar que el usuario aún existe y está activo
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true
        }
      });

      if (!user || !user.active) {
        return ApiResponseUtil.error(res, 'Invalid token', 401);
      }

      const redirectPath = AuthController.getRedirectPath(user.role);

      return ApiResponseUtil.success(res, {
        valid: true,
        user,
        redirectPath
      }, 'Token is valid');

    } catch (error) {
      console.error('Token validation error:', error);
      return ApiResponseUtil.error(res, 'Invalid token', 401);
    }
  }
}