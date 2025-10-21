import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { 
  CreateCategorySchema, 
  UpdateCategorySchema, 
  PaginationSchema 
} from '../types';
import { z } from 'zod';

const router = Router();

// Validation schemas for params
const IdParamSchema = z.object({
  id: z.string().cuid('Invalid category ID format'),
});

// Category CRUD routes
router.get('/', 
  validateQuery(PaginationSchema), 
  CategoryController.getCategories
);

router.get('/:id', 
  validateParams(IdParamSchema), 
  CategoryController.getCategoryById
);

router.post('/', 
  validateBody(CreateCategorySchema), 
  CategoryController.createCategory
);

router.put('/:id', 
  validateParams(IdParamSchema),
  validateBody(UpdateCategorySchema), 
  CategoryController.updateCategory
);

router.delete('/:id', 
  validateParams(IdParamSchema), 
  CategoryController.deleteCategory
);

export default router;