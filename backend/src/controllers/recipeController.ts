import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { 
  CreateRecipeSchema, 
  UpdateRecipeSchema, 
  CreateRecipeIngredientSchema,
  CreateRecipeInput, 
  UpdateRecipeInput,
  CreateRecipeIngredientInput,
  RecipeWithIngredients 
} from '../types/inventory';

const prisma = new PrismaClient();

// Tipos para query parameters
interface RecipeQueryParams {
  page?: string;
  limit?: string;
  search?: string;
  productId?: string;
}

// Tipo para filtros de recetas
interface RecipeWhereInput {
  active?: boolean;
  productId?: string;
  OR?: Array<{
    name?: { contains: string; mode: 'insensitive' };
    description?: { contains: string; mode: 'insensitive' };
    product?: { name: { contains: string; mode: 'insensitive' } };
  }>;
}

export class RecipeController {
  // Obtener todas las recetas
  static async getRecipes(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', search, productId } = req.query as RecipeQueryParams;
      const skip = (Number(page) - 1) * Number(limit);

      const where: RecipeWhereInput = {
        active: true,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ];
      }

      if (productId) {
        where.productId = productId;
      }

      const [recipes, total] = await Promise.all([
        prisma.recipe.findMany({
          where: where as Prisma.RecipeWhereInput,
          skip,
          take: Number(limit),
          orderBy: { name: 'asc' },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
            ingredients: {
              include: {
                ingredient: {
                  select: {
                    id: true,
                    name: true,
                    currentStock: true,
                    unit: true,
                  },
                },
              },
            },
          },
        }),
        prisma.recipe.count({ where: where as Prisma.RecipeWhereInput }),
      ]);

      const recipesWithAvailability: RecipeWithIngredients[] = recipes.map(recipe => {
        const maxPortions = recipe.ingredients.reduce((min, recipeIngredient) => {
          const availablePortions = Math.floor(
            recipeIngredient.ingredient.currentStock / recipeIngredient.quantity
          );
          return Math.min(min, availablePortions);
        }, Infinity);

        return {
          id: recipe.id,
          productId: recipe.productId,
          name: recipe.name,
          description: recipe.description || undefined,
          instructions: recipe.instructions || undefined,
          prepTime: recipe.prepTime || undefined,
          portions: recipe.portions,
          product: recipe.product,
          ingredients: recipe.ingredients,
          canPrepare: maxPortions > 0,
          maxPortions: maxPortions === Infinity ? 0 : maxPortions,
        };
      });

      return ApiResponseUtil.paginated(res, recipesWithAvailability, Number(page), Number(limit), total);
    } catch (error) {
      console.error('Error fetching recipes:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch recipes');
    }
  }

  // Obtener receta por ID
  static async getRecipeById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const recipe = await prisma.recipe.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  currentStock: true,
                  unit: true,
                  unitCost: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!recipe) {
        return ApiResponseUtil.error(res, 'Recipe not found', 404);
      }

      // Calcular disponibilidad y costos
      const maxPortions = recipe.ingredients.reduce((min, recipeIngredient) => {
        const availablePortions = Math.floor(
          recipeIngredient.ingredient.currentStock / recipeIngredient.quantity
        );
        return Math.min(min, availablePortions);
      }, Infinity);

      const totalCost = recipe.ingredients.reduce((sum, recipeIngredient) => {
        return sum + (recipeIngredient.quantity * recipeIngredient.ingredient.unitCost);
      }, 0);

      const recipeWithDetails = {
        ...recipe,
        canPrepare: maxPortions > 0,
        maxPortions: maxPortions === Infinity ? 0 : maxPortions,
        totalCost,
        costPerPortion: totalCost / recipe.portions,
      };

      return ApiResponseUtil.success(res, recipeWithDetails);
    } catch (error) {
      console.error('Error fetching recipe:', error);
      return ApiResponseUtil.error(res, 'Failed to fetch recipe');
    }
  }

  // Crear nueva receta
  static async createRecipe(req: Request, res: Response) {
    try {
      const validation = CreateRecipeSchema.safeParse(req.body);
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const recipeData: CreateRecipeInput = validation.data;

      // Verificar que el producto existe y no tiene receta
      const product = await prisma.product.findUnique({
        where: { id: recipeData.productId },
        include: { recipe: true },
      });

      if (!product) {
        return ApiResponseUtil.error(res, 'Product not found', 404);
      }

      if (product.recipe) {
        return ApiResponseUtil.error(res, 'Product already has a recipe');
      }

      const recipe = await prisma.recipe.create({
        data: recipeData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
        },
      });

      return ApiResponseUtil.success(res, recipe, 'Recipe created successfully', 201);
    } catch (error) {
      console.error('Error creating recipe:', error);
      return ApiResponseUtil.error(res, 'Failed to create recipe');
    }
  }

  // Actualizar receta
  static async updateRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validation = UpdateRecipeSchema.safeParse(req.body);
      
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const updateData: UpdateRecipeInput = validation.data;

      const recipe = await prisma.recipe.findUnique({
        where: { id },
      });

      if (!recipe) {
        return ApiResponseUtil.error(res, 'Recipe not found', 404);
      }

      const updatedRecipe = await prisma.recipe.update({
        where: { id },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  currentStock: true,
                  unit: true,
                },
              },
            },
          },
        },
      });

      return ApiResponseUtil.success(res, updatedRecipe, 'Recipe updated successfully');
    } catch (error) {
      console.error('Error updating recipe:', error);
      return ApiResponseUtil.error(res, 'Failed to update recipe');
    }
  }

  // Eliminar receta
  static async deleteRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const recipe = await prisma.recipe.findUnique({
        where: { id },
      });

      if (!recipe) {
        return ApiResponseUtil.error(res, 'Recipe not found', 404);
      }

      await prisma.recipe.update({
        where: { id },
        data: { active: false },
      });

      return ApiResponseUtil.success(res, null, 'Recipe deleted successfully');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      return ApiResponseUtil.error(res, 'Failed to delete recipe');
    }
  }

  // Agregar ingrediente a receta
  static async addIngredientToRecipe(req: Request, res: Response) {
    try {
      const { id } = req.params; // recipe ID
      const validation = CreateRecipeIngredientSchema.safeParse(req.body);
      
      if (!validation.success) {
        return ApiResponseUtil.validationError(res, validation.error.errors);
      }

      const ingredientData: CreateRecipeIngredientInput = validation.data;

      // Verificar que la receta existe
      const recipe = await prisma.recipe.findUnique({
        where: { id },
      });

      if (!recipe) {
        return ApiResponseUtil.error(res, 'Recipe not found', 404);
      }

      // Verificar que el ingrediente existe
      const ingredient = await prisma.ingredient.findUnique({
        where: { id: ingredientData.ingredientId },
      });

      if (!ingredient) {
        return ApiResponseUtil.error(res, 'Ingredient not found', 404);
      }

      // Verificar que el ingrediente no esté ya en la receta
      const existingRecipeIngredient = await prisma.recipeIngredient.findUnique({
        where: {
          recipeId_ingredientId: {
            recipeId: id,
            ingredientId: ingredientData.ingredientId,
          },
        },
      });

      if (existingRecipeIngredient) {
        return ApiResponseUtil.error(res, 'Ingredient is already in this recipe');
      }

      const recipeIngredient = await prisma.recipeIngredient.create({
        data: {
          recipeId: id,
          ...ingredientData,
        },
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              currentStock: true,
              unit: true,
            },
          },
        },
      });

      return ApiResponseUtil.success(res, recipeIngredient, 'Ingredient added to recipe successfully', 201);
    } catch (error) {
      console.error('Error adding ingredient to recipe:', error);
      return ApiResponseUtil.error(res, 'Failed to add ingredient to recipe');
    }
  }

  // Actualizar ingrediente en receta
  static async updateRecipeIngredient(req: Request, res: Response) {
    try {
      const { id, ingredientId } = req.params;
      const { quantity, unit, notes } = req.body;

      const recipeIngredient = await prisma.recipeIngredient.findUnique({
        where: {
          recipeId_ingredientId: {
            recipeId: id,
            ingredientId,
          },
        },
      });

      if (!recipeIngredient) {
        return ApiResponseUtil.error(res, 'Recipe ingredient not found', 404);
      }

      const updatedRecipeIngredient = await prisma.recipeIngredient.update({
        where: {
          recipeId_ingredientId: {
            recipeId: id,
            ingredientId,
          },
        },
        data: {
          quantity: quantity || recipeIngredient.quantity,
          unit: unit || recipeIngredient.unit,
          notes: notes !== undefined ? notes : recipeIngredient.notes,
        },
        include: {
          ingredient: {
            select: {
              id: true,
              name: true,
              currentStock: true,
              unit: true,
            },
          },
        },
      });

      return ApiResponseUtil.success(res, updatedRecipeIngredient, 'Recipe ingredient updated successfully');
    } catch (error) {
      console.error('Error updating recipe ingredient:', error);
      return ApiResponseUtil.error(res, 'Failed to update recipe ingredient');
    }
  }

  // Eliminar ingrediente de receta
  static async removeIngredientFromRecipe(req: Request, res: Response) {
    try {
      const { id, ingredientId } = req.params;

      const recipeIngredient = await prisma.recipeIngredient.findUnique({
        where: {
          recipeId_ingredientId: {
            recipeId: id,
            ingredientId,
          },
        },
      });

      if (!recipeIngredient) {
        return ApiResponseUtil.error(res, 'Recipe ingredient not found', 404);
      }

      await prisma.recipeIngredient.delete({
        where: {
          recipeId_ingredientId: {
            recipeId: id,
            ingredientId,
          },
        },
      });

      return ApiResponseUtil.success(res, null, 'Ingredient removed from recipe successfully');
    } catch (error) {
      console.error('Error removing ingredient from recipe:', error);
      return ApiResponseUtil.error(res, 'Failed to remove ingredient from recipe');
    }
  }
}