import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { CreateCategoryInput, UpdateCategoryInput } from '../types';

const prisma = new PrismaClient();

export class CategoryController {
  // GET /api/categories - Get all categories with pagination
  static async getCategories(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query as any;
      const skip = (page - 1) * limit;

      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          skip,
          take: limit,
          include: {
          products: {
            select: {
              id: true,
              name: true,
              price: true,
              active: true,
            },
            where: { active: true },
          },
        },
        }),
        prisma.category.count(),
      ]);

      return ApiResponseUtil.paginated(res, categories, page, limit, total, 'Categories retrieved successfully');
    } catch (error) {
      console.error('Error getting categories:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve categories');
    }
  }

  // GET /api/categories/:id - Get category by ID
  static async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          products: {
            where: { active: true },
          },
        },
      });

      if (!category) {
        return ApiResponseUtil.notFound(res, 'Category not found');
      }

      return ApiResponseUtil.success(res, category, 'Category retrieved successfully');
    } catch (error) {
      console.error('Error getting category:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve category');
    }
  }

  // POST /api/categories - Create new category
  static async createCategory(req: Request, res: Response) {
    try {
      const categoryData: CreateCategoryInput = req.body;

      // Check if category name already exists
      const existingCategory = await prisma.category.findFirst({
        where: {
          name: categoryData.name,
        },
      });

      if (existingCategory) {
        return ApiResponseUtil.conflict(res, 'Category with this name already exists');
      }

      // Create category
      const category = await prisma.category.create({
        data: categoryData,
      });

      return ApiResponseUtil.created(res, category, 'Category created successfully');
    } catch (error) {
      console.error('Error creating category:', error);
      return ApiResponseUtil.serverError(res, 'Failed to create category');
    }
  }

  // PUT /api/categories/:id - Update category
  static async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateCategoryInput = req.body;

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        return ApiResponseUtil.notFound(res, 'Category not found');
      }

      // Check if name is being updated and already exists
      if (updateData.name && updateData.name !== existingCategory.name) {
        const nameExists = await prisma.category.findFirst({
          where: {
            name: updateData.name,
            id: { not: id },
          },
        });

        if (nameExists) {
          return ApiResponseUtil.conflict(res, 'Category name already in use');
        }
      }

      // Update category
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
      });

      return ApiResponseUtil.success(res, updatedCategory, 'Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update category');
    }
  }

  // DELETE /api/categories/:id - Delete category
  static async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        include: {
          products: true,
        },
      });

      if (!existingCategory) {
        return ApiResponseUtil.notFound(res, 'Category not found');
      }

      // Check if category has products
      if (existingCategory.products.length > 0) {
        return ApiResponseUtil.conflict(res, 'Cannot delete category with products. Please delete or reassign products first.');
      }

      // Delete category
      await prisma.category.delete({
        where: { id },
      });

      return ApiResponseUtil.success(res, null, 'Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      return ApiResponseUtil.serverError(res, 'Failed to delete category');
    }
  }
}