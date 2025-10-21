import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { 
  CreateProductSchema, 
  UpdateProductSchema, 
  PaginationSchema 
} from '../types';
import { z } from 'zod';

const router = Router();

// Validation schemas for params
const IdParamSchema = z.object({
  id: z.string().cuid('Invalid product ID format'),
});

const CategoryIdParamSchema = z.object({
  categoryId: z.string().cuid('Invalid category ID format'),
});

// Query schemas
const ProductQuerySchema = PaginationSchema.extend({
  categoryId: z.string().cuid().optional(),
  available: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

const CategoryProductQuerySchema = z.object({
  available: z.enum(['true', 'false']).optional(),
});

const AvailabilityUpdateSchema = z.object({
  active: z.boolean(),
});

// Product CRUD routes
router.get('/', 
  validateQuery(ProductQuerySchema), 
  ProductController.getProducts
);

router.get('/category/:categoryId', 
  validateParams(CategoryIdParamSchema),
  validateQuery(CategoryProductQuerySchema), 
  ProductController.getProductsByCategory
);

router.get('/:id', 
  validateParams(IdParamSchema), 
  ProductController.getProductById
);

router.post('/', 
  validateBody(CreateProductSchema), 
  ProductController.createProduct
);

router.put('/:id', 
  validateParams(IdParamSchema),
  validateBody(UpdateProductSchema), 
  ProductController.updateProduct
);

router.patch('/:id/availability', 
  validateParams(IdParamSchema),
  validateBody(AvailabilityUpdateSchema), 
  ProductController.toggleAvailability
);

router.delete('/:id', 
  validateParams(IdParamSchema), 
  ProductController.deleteProduct
);

export default router;