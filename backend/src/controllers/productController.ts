import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { ApiResponseUtil } from '../utils/response';
import { CreateProductInput, UpdateProductInput } from '../types';

const prisma = new PrismaClient();

// Tipos para query parameters
interface ProductQueryParams {
  page?: string;
  limit?: string;
  categoryId?: string;
  available?: string;
  search?: string;
}

interface CategoryQueryParams {
  available?: string;
}

// Tipo para filtros de productos
interface ProductWhereInput {
  categoryId?: string;
  active?: boolean;
  OR?: Array<{
    name?: { contains: string };
    description?: { contains: string };
  }>;
}

export class ProductController {
  // GET /api/products - Get all products with pagination and filters
  static async getProducts(req: Request, res: Response) {
    try {
      const { page = '1', limit = '10', categoryId, available, search } = req.query as ProductQueryParams;
      const skip = (Number(page) - 1) * Number(limit);

      // Build where clause
      const where: ProductWhereInput = {};
      
      if (categoryId) {
        where.categoryId = categoryId;
      }
      
      if (available !== undefined) {
        where.active = available === 'true';
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search } },
          { description: { contains: search } },
        ];
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          skip,
          take: Number(limit),
          where: where as Prisma.ProductWhereInput,
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.product.count({ where: where as Prisma.ProductWhereInput }),
      ]);

      return ApiResponseUtil.paginated(res, products, Number(page), Number(limit), total, 'Products retrieved successfully');
    } catch (error) {
      console.error('Error getting products:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve products');
    }
  }

  // GET /api/products/:id - Get product by ID
  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
        },
      });

      if (!product) {
        return ApiResponseUtil.notFound(res, 'Product not found');
      }

      return ApiResponseUtil.success(res, product, 'Product retrieved successfully');
    } catch (error) {
      console.error('Error getting product:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve product');
    }
  }

  // GET /api/products/category/:categoryId - Get products by category
  static async getProductsByCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const { available = 'true' } = req.query as CategoryQueryParams;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        return ApiResponseUtil.notFound(res, 'Category not found');
      }

      const products = await prisma.product.findMany({
        where: {
          categoryId,
          ...(available !== undefined && { active: available === 'true' }),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return ApiResponseUtil.success(res, products, 'Products retrieved successfully');
    } catch (error) {
      console.error('Error getting products by category:', error);
      return ApiResponseUtil.serverError(res, 'Failed to retrieve products');
    }
  }

  // POST /api/products - Create new product
  static async createProduct(req: Request, res: Response) {
    try {
      const productData: CreateProductInput = req.body;

      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId },
      });

      if (!category) {
        return ApiResponseUtil.notFound(res, 'Category not found');
      }

      // Check if product name already exists in the same category
      const existingProduct = await prisma.product.findFirst({
        where: {
          name: productData.name,
          categoryId: productData.categoryId,
        },
      });

      if (existingProduct) {
        return ApiResponseUtil.conflict(res, 'Product with this name already exists in this category');
      }

      // Create product
      const product = await prisma.product.create({
        data: productData,
        include: {
          category: true,
        },
      });

      return ApiResponseUtil.created(res, product, 'Product created successfully');
    } catch (error) {
      console.error('Error creating product:', error);
      return ApiResponseUtil.serverError(res, 'Failed to create product');
    }
  }

  // PUT /api/products/:id - Update product
  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData: UpdateProductInput = req.body;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return ApiResponseUtil.notFound(res, 'Product not found');
      }

      // Check if category exists (if being updated)
      if (updateData.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: updateData.categoryId },
        });

        if (!category) {
          return ApiResponseUtil.notFound(res, 'Category not found');
        }
      }

      // Check if name is being updated and already exists in the category
      if (updateData.name && updateData.name !== existingProduct.name) {
        const categoryId = updateData.categoryId || existingProduct.categoryId;
        const nameExists = await prisma.product.findFirst({
          where: {
            name: updateData.name,
            categoryId,
            id: { not: id },
          },
        });

        if (nameExists) {
          return ApiResponseUtil.conflict(res, 'Product name already exists in this category');
        }
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
        },
      });

      return ApiResponseUtil.success(res, updatedProduct, 'Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update product');
    }
  }

  // DELETE /api/products/:id - Delete product
  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              order: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
      });

      if (!existingProduct) {
        return ApiResponseUtil.notFound(res, 'Product not found');
      }

      // Check if product has any order items (active or completed)
      if (existingProduct.orderItems.length > 0) {
        return ApiResponseUtil.conflict(res, 'Cannot delete product that has been ordered. Product has order history.');
      }

      // Delete product
      await prisma.product.delete({
        where: { id },
      });

      return ApiResponseUtil.success(res, null, 'Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      return ApiResponseUtil.serverError(res, 'Failed to delete product');
    }
  }

  // PATCH /api/products/:id/availability - Toggle product availability
  static async toggleAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { active } = req.body;

      if (typeof active !== 'boolean') {
        return ApiResponseUtil.error(res, 'Active field must be a boolean');
      }

      // Check if product exists
      const existingProduct = await prisma.product.findUnique({
        where: { id },
      });

      if (!existingProduct) {
        return ApiResponseUtil.notFound(res, 'Product not found');
      }

      // Update availability
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { active: active },
        include: {
          category: true,
        },
      });

      return ApiResponseUtil.success(res, updatedProduct, 'Product availability updated successfully');
    } catch (error) {
      console.error('Error updating product availability:', error);
      return ApiResponseUtil.serverError(res, 'Failed to update product availability');
    }
  }
}