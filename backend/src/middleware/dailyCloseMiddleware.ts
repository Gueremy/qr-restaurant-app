import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';

const prisma = new PrismaClient();

export class DailyCloseMiddleware {
  // Middleware para verificar si el día está cerrado antes de permitir modificaciones
  static async checkDayNotClosed(req: Request, res: Response, next: NextFunction) {
    try {
      // Solo aplicar a operaciones que modifican datos
      const modifyingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
      if (!modifyingMethods.includes(req.method)) {
        return next();
      }

      // Rutas excluidas del bloqueo (administración y reapertura)
      const excludedPaths = [
        '/api/daily-close/reopen',
        '/api/auth/login',
        '/api/auth/logout',
        '/api/daily-close/status',
        '/api/daily-close/history',
        '/api/reports'
      ];

      const isExcluded = excludedPaths.some(path => req.path.startsWith(path));
      if (isExcluded) {
        return next();
      }

      // Verificar si hoy está cerrado
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayClose = await prisma.dailyClose.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          },
          reopenedAt: null // Solo bloquear si no ha sido reabierto
        }
      });

      if (todayClose) {
        return ApiResponseUtil.error(res, 
          'El día está cerrado. No se pueden realizar modificaciones. Contacte al administrador para reabrir si es necesario.', 
          423 // Locked
        );
      }

      next();
    } catch (error) {
      console.error('Error checking daily close status:', error);
      // En caso de error, permitir la operación para no bloquear el sistema
      next();
    }
  }

  // Middleware específico para operaciones críticas (solo admin puede hacerlas después del cierre)
  static async checkCriticalOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const userRole = (req as any).user?.role;
      
      // Si no es admin, aplicar el bloqueo normal
      if (userRole !== 'ADMIN') {
        return DailyCloseMiddleware.checkDayNotClosed(req, res, next);
      }

      // Los admins pueden realizar operaciones críticas incluso después del cierre
      next();
    } catch (error) {
      console.error('Error checking critical operation:', error);
      next();
    }
  }

  // Middleware para verificar si se puede crear/modificar pedidos
  static async checkOrderOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayClose = await prisma.dailyClose.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          },
          reopenedAt: null
        }
      });

      if (todayClose) {
        ApiResponseUtil.error(res, 
          'No se pueden crear o modificar pedidos después del cierre diario', 
          423
        );
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking order operations:', error);
      next();
    }
  }

  // Middleware para verificar si se pueden procesar pagos
  static async checkPaymentOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayClose = await prisma.dailyClose.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          },
          reopenedAt: null
        }
      });

      if (todayClose) {
        ApiResponseUtil.error(res, 
          'No se pueden procesar pagos después del cierre diario', 
          423
        );
        return;
      }

      next();
    } catch (error) {
      console.error('Error checking payment operations:', error);
      next();
    }
  }

  // Middleware para verificar si se pueden modificar productos/inventario
  static async checkInventoryOperations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userRole = (req as any).user?.role;
      
      // Solo admins y managers pueden modificar inventario después del cierre
      if (!['ADMIN', 'MANAGER'].includes(userRole)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayClose = await prisma.dailyClose.findFirst({
          where: {
            date: {
              gte: today,
              lt: tomorrow
            },
            reopenedAt: null
          }
        });

        if (todayClose) {
          ApiResponseUtil.error(res, 
            'No se puede modificar el inventario después del cierre diario. Solo administradores y gerentes pueden hacerlo.', 
            423
          );
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Error checking inventory operations:', error);
      next();
    }
  }

  // Middleware para logging de operaciones después del cierre (para auditoría)
  static async logPostCloseOperations(req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayClose = await prisma.dailyClose.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      // Si el día está cerrado y se permite la operación, registrarla para auditoría
      if (todayClose) {
        const userId = (req as any).user?.userId;
        const userRole = (req as any).user?.role;
        
        console.log(`POST-CLOSE OPERATION: ${req.method} ${req.path} by user ${userId} (${userRole}) at ${new Date().toISOString()}`);
        
        // Aquí podrías guardar en una tabla de auditoría si es necesario
        // await prisma.auditLog.create({...})
      }

      next();
    } catch (error) {
      console.error('Error logging post-close operation:', error);
      next();
    }
  }
}

export default DailyCloseMiddleware;