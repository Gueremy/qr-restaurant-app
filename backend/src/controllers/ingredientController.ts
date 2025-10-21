import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { 
  CreateIngredientSchema, 
  UpdateIngredientSchema, 
  CreateIngredientInput, 
  UpdateIngredientInput,
  IngredientWithStock 
} from '../types/inventory';

const prisma = new PrismaClient();

// Tipo para los filtros de búsqueda de ingredientes
interface IngredientWhereInput {
  active: boolean;
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    description?: { contains: string; mode: 'insensitive' };
  }>;
  unit?: string;
  currentStock?: { lte: number };
}

export class IngredientController {
  // Obtener todos los ingredientes
  static async getIngredients(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10, search, unit, lowStock } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: IngredientWhereInput = {
        active: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      if (unit) {
        where.unit = unit as string;
      }

      if (lowStock === 'true') {
        where.currentStock = { lte: 10 }; // Asumiendo stock bajo como <= 10
      }

      const [ingredients, total] = await Promise.all([
        prisma.ingredient.findMany({
          where: where as Prisma.IngredientWhereInput,
          skip,
          take: Number(limit),
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                stockMovements: true,
                stockAlerts: { where: { isRead: false } },
              },
            },
          },
        }),
        prisma.ingredient.count({ where }),
      ]);

      const ingredientsWithStock: IngredientWithStock[] = ingredients.map(ingredient => ({
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        currentStock: ingredient.currentStock,
        minStock: ingredient.minStock,
        maxStock: ingredient.maxStock || undefined,
        unitCost: ingredient.unitCost,
        supplier: ingredient.supplier || undefined,
        stockStatus: ingredient.currentStock <= 0 ? 'OUT' : 
                    ingredient.currentStock <= ingredient.minStock ? 'LOW' : 'OK',
        stockValue: ingredient.currentStock * ingredient.unitCost,
      }));

      return ApiResponseUtil.paginated(res, ingredientsWithStock, Number(page), Number(limit), total);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch ingredients');
    }
  }

  // Obtener ingrediente por ID
  static async getIngredientById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ingredient = await prisma.ingredient.findUnique({
        where: { id },
        include: {
          stockMovements: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              user: {
                select: { name: true },
              },
            },
          },
          stockAlerts: {
            where: { isRead: false },
            orderBy: { createdAt: 'desc' },
          },
          recipeIngredients: {
            include: {
              recipe: {
                include: {
                  product: {
                    select: { name: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!ingredient) {
        return ApiResponseUtil.error(res, 'Ingredient not found', 404);
      }

      return ApiResponseUtil.success(res, ingredient);
    } catch (error) {
      console.error('Error fetching ingredient:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch ingredient');
    }
  }

  // Crear nuevo ingrediente
  static async createIngredient(req: Request, res: Response) {
    try {
      const validation = CreateIngredientSchema.safeParse(req.body);
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const ingredientData: CreateIngredientInput = validation.data;

      // Verificar si ya existe un ingrediente con el mismo nombre
      const existingIngredient = await prisma.ingredient.findFirst({
        where: {
          name: ingredientData.name,
          active: true,
        },
      });

      if (existingIngredient) {
        return ApiResponseUtil.error(res, 'An ingredient with this name already exists');
      }

      const ingredient = await prisma.ingredient.create({
        data: ingredientData,
      });

      return ApiResponseUtil.success(res, ingredient, 'Ingredient created successfully', 201);
    } catch (error) {
      console.error('Error creating ingredient:', error);
      return ApiResponseUtil.error(res, 'Failed to create ingredient');
    }
  }

  // Actualizar ingrediente
  static async updateIngredient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validation = UpdateIngredientSchema.safeParse(req.body);
      
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const updateData: UpdateIngredientInput = validation.data;

      // Verificar si el ingrediente existe
      const existingIngredient = await prisma.ingredient.findUnique({
        where: { id },
      });

      if (!existingIngredient) {
        return ApiResponseUtil.error(res, 'Ingredient not found', 404);
      }

      // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre
      if (updateData.name && updateData.name !== existingIngredient.name) {
        const duplicateIngredient = await prisma.ingredient.findFirst({
          where: {
            name: updateData.name,
            active: true,
            id: { not: id },
          },
        });

        if (duplicateIngredient) {
          return ApiResponseUtil.error(res, 'An ingredient with this name already exists');
        }
      }

      const ingredient = await prisma.ingredient.update({
        where: { id },
        data: updateData,
      });

      return ApiResponseUtil.success(res, ingredient, 'Ingredient updated successfully');
    } catch (error) {
      console.error('Error updating ingredient:', error);
      return ApiResponseUtil.error(res, 'Failed to update ingredient');
    }
  }

  // Eliminar ingrediente (soft delete)
  static async deleteIngredient(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const ingredient = await prisma.ingredient.findUnique({
        where: { id },
        include: {
          recipeIngredients: true,
        },
      });

      if (!ingredient) {
        return ApiResponseUtil.error(res, 'Ingredient not found', 404);
      }

      // Verificar si el ingrediente está siendo usado en recetas
      if (ingredient.recipeIngredients.length > 0) {
        return ApiResponseUtil.error(res, 'Cannot delete ingredient that is used in recipes');
      }

      await prisma.ingredient.update({
        where: { id },
        data: { active: false },
      });

      return ApiResponseUtil.success(res, null, 'Ingredient deleted successfully');
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      return ApiResponseUtil.error(res, 'Failed to delete ingredient');
    }
  }

  // Obtener estadísticas de inventario
  static async getInventoryStats(req: Request, res: Response) {
    try {
      const [
        totalIngredients,
        lowStockIngredients,
        outOfStockIngredients,
        recentMovements,
        activeAlerts,
        ingredientsWithValue,
      ] = await Promise.all([
        prisma.ingredient.count({ where: { active: true } }),
        prisma.ingredient.count({
          where: {
            active: true,
            AND: [
              { currentStock: { gt: 0 } },
              { 
                OR: [
                  { currentStock: { lte: 10 } }, // Asumiendo stock bajo como <= 10
                ]
              }
            ]
          },
        }),
        prisma.ingredient.count({
          where: {
            active: true,
            currentStock: { lte: 0 },
          },
        }),
        prisma.stockMovement.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // últimas 24 horas
            },
          },
        }),
        prisma.stockAlert.count({
          where: { isRead: false },
        }),
        prisma.ingredient.findMany({
          where: { active: true },
          select: {
            currentStock: true,
            unitCost: true,
          },
        }),
      ]);

      const totalValue = ingredientsWithValue.reduce(
        (sum, ingredient) => sum + (ingredient.currentStock * ingredient.unitCost),
        0
      );

      const stats = {
        totalIngredients,
        lowStockIngredients,
        outOfStockIngredients,
        totalValue,
        recentMovements,
        activeAlerts,
      };

      return ApiResponseUtil.success(res, stats);
    } catch (error) {
      console.error('Error fetching inventory stats:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch inventory statistics');
    }
  }
}