import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { 
  CreateStockMovementSchema, 
  CreateStockAlertSchema,
  CreateStockMovementInput, 
  CreateStockAlertInput 
} from '../types/inventory';
import { socketService } from '../index';

const prisma = new PrismaClient();

// Interface for stock movement query parameters
interface StockMovementQueryParams {
  page?: string;
  limit?: string;
  ingredientId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
}

// Interface for stock alert query parameters
interface StockAlertQueryParams {
  page?: string;
  limit?: string;
  type?: string;
  isRead?: string;
  ingredientId?: string;
}

// Interface for stock movement where clause
interface StockMovementWhereInput {
  ingredientId?: string;
  type?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
}

// Interface for stock alert where clause
interface StockAlertWhereInput {
  type?: string;
  isRead?: boolean;
  ingredientId?: string;
}

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: string;
    email: string;
    role: string;
  };
}

export class StockController {
  // Obtener movimientos de stock
  static async getStockMovements(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', ingredientId, type, startDate, endDate } = req.query as StockMovementQueryParams;
      const skip = (Number(page) - 1) * Number(limit);

      const where: StockMovementWhereInput = {};

      if (ingredientId) {
        where.ingredientId = ingredientId;
      }

      if (type) {
        where.type = type;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        prisma.stockMovement.count({ where }),
      ]);

      return ApiResponseUtil.paginated(res, movements, Number(page), Number(limit), total);
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch stock movements');
    }
  }

  // Crear movimiento de stock
  static async createStockMovement(req: Request, res: Response) {
    try {
      const validation = CreateStockMovementSchema.safeParse(req.body);
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const movementData: CreateStockMovementInput = validation.data;
      const userId = (req as AuthenticatedRequest).user?.id;

      // Verificar que el ingrediente existe
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: movementData.ingredientId },
      });

      if (!ingredient) {
        return ApiResponseUtil.error(res, 'Ingredient not found', 404);
      }

      // Calcular nuevo stock
      let newStock = ingredient.currentStock;
      if (movementData.type === 'IN') {
        newStock += movementData.quantity;
      } else if (movementData.type === 'OUT' || movementData.type === 'WASTE') {
        newStock -= movementData.quantity;
        if (newStock < 0) {
          return ApiResponseUtil.error(res, 'Insufficient stock for this operation');
        }
      } else if (movementData.type === 'ADJUSTMENT') {
        newStock = movementData.quantity;
      }

      // Crear movimiento y actualizar stock en transacción
      const result = await prisma.$transaction(async (tx: any) => {
        // Crear el movimiento
        const movement = await tx.stockMovement.create({
          data: {
            ...movementData,
            userId,
          },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Actualizar stock del ingrediente
        const updatedIngredient = await tx.ingredient.update({
          where: { id: movementData.ingredientId },
          data: { currentStock: newStock },
        });

        // Verificar si necesita crear alertas
        if (newStock <= 0) {
          await tx.stockAlert.create({
            data: {
              ingredientId: movementData.ingredientId,
              type: 'OUT_OF_STOCK',
              message: `${ingredient.name} is out of stock`,
            },
          });

          // Notificar por Socket.io
          socketService.notifyLowStock({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            currentStock: newStock,
            minStock: ingredient.minStock,
            type: 'OUT_OF_STOCK',
          });
        } else if (newStock <= ingredient.minStock) {
          await tx.stockAlert.create({
            data: {
              ingredientId: movementData.ingredientId,
              type: 'LOW_STOCK',
              message: `${ingredient.name} is running low (${newStock} ${ingredient.unit} remaining)`,
            },
          });

          // Notificar por Socket.io
          socketService.notifyLowStock({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            currentStock: newStock,
            minStock: ingredient.minStock,
            type: 'LOW_STOCK',
          });
        }

        return { movement, updatedIngredient };
      });

      return ApiResponseUtil.success(res, result.movement, 'Stock movement created successfully', 201);
    } catch (error) {
      console.error('Error creating stock movement:', error);
      return ApiResponseUtil.error(res, 'Failed to create stock movement');
    }
  }

  // Obtener alertas de stock
  static async getStockAlerts(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', type, isRead, ingredientId } = req.query as StockAlertQueryParams;
      const skip = (Number(page) - 1) * Number(limit);

      const where: StockAlertWhereInput = {};

      if (type) {
        where.type = type;
      }

      if (isRead !== undefined) {
        where.isRead = isRead === 'true';
      }

      if (ingredientId) {
        where.ingredientId = ingredientId;
      }

      const [alerts, total] = await Promise.all([
        prisma.stockAlert.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                currentStock: true,
                minStock: true,
                unit: true,
              },
            },
          },
        }),
        prisma.stockAlert.count({ where }),
      ]);

      return ApiResponseUtil.paginated(res, alerts, Number(page), Number(limit), total);
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch stock alerts');
    }
  }

  // Marcar alerta como leída
  static async markAlertAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const alert = await prisma.stockAlert.findUnique({
        where: { id },
      });

      if (!alert) {
        return ApiResponseUtil.error(res, 'Alert not found', 404);
      }

      const updatedAlert = await prisma.stockAlert.update({
        where: { id },
        data: {
          isRead: true,
          readAt: new Date(),
        },
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              currentStock: true,
              minStock: true,
              unit: true,
            },
          },
        },
      });

      return ApiResponseUtil.success(res, updatedAlert, 'Alert marked as read');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      return ApiResponseUtil.error(res, 'Failed to mark alert as read');
    }
  }

  // Marcar todas las alertas como leídas
  static async markAllAlertsAsRead(req: Request, res: Response) {
    try {
      const { ingredientId } = req.query;

      const where: StockAlertWhereInput = { isRead: false };
      if (ingredientId) {
        where.ingredientId = ingredientId as string;
      }

      const result = await prisma.stockAlert.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return ApiResponseUtil.success(res, { count: result.count }, 'All alerts marked as read');
    } catch (error) {
      console.error('Error marking all alerts as read:', error);
      return ApiResponseUtil.error(res, 'Failed to mark all alerts as read');
    }
  }

  // Crear alerta manual
  static async createStockAlert(req: Request, res: Response) {
    try {
      const validation = CreateStockAlertSchema.safeParse(req.body);
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const alertData: CreateStockAlertInput = validation.data;

      // Verificar que el ingrediente existe
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: alertData.ingredientId },
      });

      if (!ingredient) {
        return ApiResponseUtil.error(res, 'Ingredient not found', 404);
      }

      const alert = await prisma.stockAlert.create({
        data: alertData,
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              currentStock: true,
              minStock: true,
              unit: true,
            },
          },
        },
      });

      // Notificar por Socket.io
      socketService.notifyLowStock({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        currentStock: ingredient.currentStock,
        minStock: ingredient.minStock,
        type: alertData.type as 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED',
      });

      return ApiResponseUtil.success(res, alert, 'Stock alert created successfully', 201);
    } catch (error) {
      console.error('Error creating stock alert:', error);
      return ApiResponseUtil.error(res, 'Failed to create stock alert');
    }
  }

  // Obtener resumen de stock crítico
  static async getCriticalStock(req: Request, res: Response) {
    try {
      const [outOfStock, lowStock] = await Promise.all([
        prisma.ingredient.findMany({
          where: {
            active: true,
            currentStock: { lte: 0 },
          },
          select: {
            id: true,
            name: true,
            currentStock: true,
            minStock: true,
            unit: true,
            supplier: true,
          },
          orderBy: { name: 'asc' },
        }),
        prisma.ingredient.findMany({
          where: {
            active: true,
            currentStock: { gt: 0, lte: prisma.ingredient.fields.minStock },
          },
          select: {
            id: true,
            name: true,
            currentStock: true,
            minStock: true,
            unit: true,
            supplier: true,
          },
          orderBy: { name: 'asc' },
        }),
      ]);

      const criticalStock = {
        outOfStock,
        lowStock,
        totalCritical: outOfStock.length + lowStock.length,
      };

      return ApiResponseUtil.success(res, criticalStock);
    } catch (error) {
      console.error('Error fetching critical stock:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch critical stock information');
    }
  }

  // Procesar orden y descontar ingredientes
  static async processOrderIngredients(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const userId = (req as AuthenticatedRequest).user?.id;

      // Obtener la orden con sus items y productos con recetas
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  recipe: {
                    include: {
                      ingredients: {
                        include: {
                          ingredient: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!order) {
        return ApiResponseUtil.error(res, 'Order not found', 404);
      }

      if (order.status !== 'CONFIRMED') {
        return ApiResponseUtil.error(res, 'Order must be confirmed to process ingredients');
      }

      // Calcular ingredientes necesarios
      const ingredientRequirements: { [key: string]: number } = {};

      for (const item of order.items) {
        if (item.product.recipe) {
          for (const recipeIngredient of item.product.recipe.ingredients) {
            const totalNeeded = recipeIngredient.quantity * item.quantity;
            if (ingredientRequirements[recipeIngredient.ingredientId]) {
              ingredientRequirements[recipeIngredient.ingredientId] += totalNeeded;
            } else {
              ingredientRequirements[recipeIngredient.ingredientId] = totalNeeded;
            }
          }
        }
      }

      // Verificar disponibilidad de ingredientes
      const ingredientIds = Object.keys(ingredientRequirements);
      const ingredients = await prisma.ingredient.findMany({
        where: { id: { in: ingredientIds } },
      });

      const insufficientIngredients = [];
      for (const ingredient of ingredients) {
        const required = ingredientRequirements[ingredient.id];
        if (ingredient.currentStock < required) {
          insufficientIngredients.push({
            name: ingredient.name,
            required,
            available: ingredient.currentStock,
            unit: ingredient.unit,
          });
        }
      }

      if (insufficientIngredients.length > 0) {
         return ApiResponseUtil.error(res, 'Insufficient ingredients', 400);
       }

      // Procesar movimientos de stock
      const movements = [];
      for (const ingredientId of ingredientIds) {
        const quantity = ingredientRequirements[ingredientId];
        const ingredient = ingredients.find((i: any) => i.id === ingredientId)!;

        const movement = await prisma.stockMovement.create({
          data: {
            ingredientId,
            type: 'OUT',
            quantity,
            reason: 'Order processing',
            reference: orderId,
            userId,
          },
        });

        // Actualizar stock
        await prisma.ingredient.update({
          where: { id: ingredientId },
          data: {
            currentStock: ingredient.currentStock - quantity,
          },
        });

        movements.push(movement);
      }

      return ApiResponseUtil.success(res, { movements, processedIngredients: ingredientIds.length }, 'Order ingredients processed successfully');
    } catch (error) {
      console.error('Error processing order ingredients:', error);
      return ApiResponseUtil.error(res, 'Failed to process order ingredients');
    }
  }
}