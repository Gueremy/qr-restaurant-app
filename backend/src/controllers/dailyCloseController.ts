import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export class DailyCloseController {
  // GET /api/daily-close/status - Verificar estado del cierre diario
  static async getCloseStatus(req: Request, res: Response) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Buscar si ya existe un cierre para hoy
      const todayClose = await prisma.dailyClose.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      const isClosed = !!todayClose;
      const canClose = !isClosed;

      return ApiResponseUtil.success(res, {
        isClosed,
        canClose,
        closeDate: todayClose?.closeDate || null,
        closedBy: todayClose?.closedBy || null,
        totalSales: todayClose?.totalSales || 0,
        totalOrders: todayClose?.totalOrders || 0
      }, 'Close status retrieved successfully');

    } catch (error) {
      console.error('Error getting close status:', error);
      return ApiResponseUtil.serverError(res, 'Failed to get close status');
    }
  }

  // GET /api/daily-close/pre-validation - Validaciones pre-cierre
  static async preCloseValidation(req: Request, res: Response) {
    try {
      const validationResults = {
        canClose: true,
        issues: [] as string[],
        warnings: [] as string[]
      };

      // 1. Verificar pedidos pendientes
      const pendingOrders = await prisma.order.findMany({
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PREPARING']
          }
        },
        include: {
          table: true
        }
      });

      if (pendingOrders.length > 0) {
        validationResults.canClose = false;
        validationResults.issues.push(
          `Hay ${pendingOrders.length} pedidos pendientes que deben completarse antes del cierre`
        );
      }

      // 2. Verificar turnos abiertos
      const openShifts = await prisma.shift.findMany({
        where: {
          endTime: null
        },
        include: {
          user: {
            select: { name: true }
          }
        }
      });

      if (openShifts.length > 0) {
        validationResults.canClose = false;
        validationResults.issues.push(
          `Hay ${openShifts.length} turnos abiertos que deben cerrarse`
        );
      }

      // 3. Verificar pagos pendientes
      const pendingPayments = await prisma.payment.findMany({
        where: {
          status: 'PENDING'
        }
      });

      if (pendingPayments.length > 0) {
        validationResults.warnings.push(
          `Hay ${pendingPayments.length} pagos pendientes`
        );
      }

      // 4. Verificar inventario bajo
      const lowStockProducts = await prisma.product.findMany({
        where: {
          stock: {
            lte: 5
          }
        }
      });

      if (lowStockProducts.length > 0) {
        validationResults.warnings.push(
          `${lowStockProducts.length} productos tienen stock bajo`
        );
      }

      // 5. Verificar si ya se cerró hoy
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

      if (todayClose) {
        validationResults.canClose = false;
        validationResults.issues.push('El cierre diario ya fue realizado hoy');
      }

      return ApiResponseUtil.success(res, validationResults, 'Pre-close validation completed');

    } catch (error) {
      console.error('Error in pre-close validation:', error);
      return ApiResponseUtil.serverError(res, 'Failed to validate pre-close');
    }
  }

  // POST /api/daily-close/execute - Ejecutar cierre diario
  static async executeDailyClose(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      
      if (!userId) {
        return ApiResponseUtil.error(res, 'User not authenticated', 401);
      }

      // Primero validar que se puede cerrar
      const validation = await DailyCloseController.validatePreCloseInternal();
      if (!validation.canClose) {
        return ApiResponseUtil.error(res, 'Cannot close day: ' + validation.issues.join(', '), 400);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calcular estadísticas del día
      const todayOrders = await prisma.order.findMany({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          },
          status: 'DELIVERED'
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
          payments: true
        }
      });

      const totalSales = todayOrders.reduce((sum: number, order: any) => sum + order.total, 0);
      const totalOrders = todayOrders.length;

      // Calcular productos más vendidos
      const productSales = new Map();
      todayOrders.forEach((order: any) => {
        order.items.forEach((item: any) => {
          const key = item.product.name;
          const current = productSales.get(key) || 0;
          productSales.set(key, current + item.quantity);
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Generar respaldo
      const backupPath = await DailyCloseController.generateBackup(today);

      // Crear registro de cierre diario
      const dailyClose = await prisma.dailyClose.create({
        data: {
          date: new Date(),
          closedBy: userId,
          totalSales,
          totalOrders,
          topProducts: JSON.stringify(topProducts),
          backupPath,
          notes: req.body.notes || ''
        }
      });

      // Cerrar todos los turnos abiertos
      await prisma.shift.updateMany({
        where: {
          endTime: null
        },
        data: {
          endTime: new Date(),
          notes: 'Cerrado automáticamente por cierre diario'
        }
      });

      // Bloquear modificaciones (esto se manejará en middleware)
      // Por ahora solo registramos el cierre

      return ApiResponseUtil.success(res, {
        closeId: dailyClose.id,
        closeDate: dailyClose.closeDate,
        totalSales,
        totalOrders,
        topProducts,
        backupPath
      }, 'Daily close executed successfully');

    } catch (error) {
      console.error('Error executing daily close:', error);
      return ApiResponseUtil.serverError(res, 'Failed to execute daily close');
    }
  }

  // GET /api/daily-close/history - Historial de cierres
  static async getCloseHistory(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [closes, total] = await Promise.all([
        prisma.dailyClose.findMany({
          skip,
          take: Number(limit),
          orderBy: {
            date: 'desc'
          }
        }),
        prisma.dailyClose.count()
      ]);

      const closesWithParsedData = closes.map((close: any) => ({
        ...close,
        topProducts: close.topProducts ? JSON.parse(close.topProducts as string) : []
      }));

      return ApiResponseUtil.success(res, {
        closes: closesWithParsedData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }, 'Close history retrieved successfully');

    } catch (error) {
      console.error('Error getting close history:', error);
      return ApiResponseUtil.serverError(res, 'Failed to get close history');
    }
  }

  // POST /api/daily-close/reopen - Reabrir día (solo emergencias)
  static async reopenDay(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      const userRole = (req as any).user?.role;
      const { reason } = req.body;

      if (!userId) {
        return ApiResponseUtil.error(res, 'User not authenticated', 401);
      }

      if (userRole !== 'ADMIN') {
        return ApiResponseUtil.error(res, 'Only administrators can reopen days', 403);
      }

      if (!reason) {
        return ApiResponseUtil.error(res, 'Reason is required to reopen day', 400);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Buscar el cierre de hoy
      const todayClose = await prisma.dailyClose.findFirst({
        where: {
          date: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (!todayClose) {
        return ApiResponseUtil.error(res, 'No close found for today', 404);
      }

      // Marcar como reabierto
      await prisma.dailyClose.update({
        where: { id: todayClose.id },
        data: {
          reopenedAt: new Date()
        }
      });

      return ApiResponseUtil.success(res, null, 'Day reopened successfully');

    } catch (error) {
      console.error('Error reopening day:', error);
      return ApiResponseUtil.serverError(res, 'Failed to reopen day');
    }
  }

  // Método privado para validación interna
  private static async validatePreCloseInternal() {
    const validationResults = {
      canClose: true,
      issues: [] as string[]
    };

    // Verificar pedidos pendientes
    const pendingOrders = await prisma.order.count({
      where: {
        status: {
          in: ['PENDING', 'CONFIRMED', 'PREPARING']
        }
      }
    });

    if (pendingOrders > 0) {
      validationResults.canClose = false;
      validationResults.issues.push(`${pendingOrders} pedidos pendientes`);
    }

    // Verificar turnos abiertos
    const openShifts = await prisma.shift.count({
      where: {
        endTime: null
      }
    });

    if (openShifts > 0) {
      validationResults.canClose = false;
      validationResults.issues.push(`${openShifts} turnos abiertos`);
    }

    // Verificar si ya se cerró hoy
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

    if (todayClose) {
      validationResults.canClose = false;
      validationResults.issues.push('Ya cerrado hoy');
    }

    return validationResults;
  }

  // Método privado para generar respaldo
  private static async generateBackup(date: Date): Promise<string> {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const backupDir = path.join(process.cwd(), 'backups');
      
      // Crear directorio de respaldos si no existe
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupFileName = `backup_${dateStr}.json`;
      const backupPath = path.join(backupDir, backupFileName);

      // Obtener datos para el respaldo
      const [orders, products, users, categories, tables] = await Promise.all([
        prisma.order.findMany({
          where: {
            createdAt: {
              gte: date,
              lt: new Date(date.getTime() + 24 * 60 * 60 * 1000)
            }
          },
          include: {
            items: { include: { product: true } },
            payments: true,
            table: true,
            user: { select: { name: true, email: true } }
          }
        }),
        prisma.product.findMany({ include: { category: true } }),
        prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } }),
        prisma.category.findMany(),
        prisma.table.findMany()
      ]);

      const backupData = {
        date: dateStr,
        timestamp: new Date().toISOString(),
        data: {
          orders,
          products,
          users,
          categories,
          tables
        }
      };

      // Escribir archivo de respaldo
      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));

      return backupPath;
    } catch (error) {
      console.error('Error generating backup:', error);
      throw new Error('Failed to generate backup');
    }
  }
}