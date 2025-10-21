import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  CreateUserSchema, 
  UpdateUserSchema, 
  LoginSchema, 
  PaginationSchema 
} from '../types';
import { z } from 'zod';

const router = Router();

// Validation schemas for params
const IdParamSchema = z.object({
  id: z.string().cuid('Invalid user ID format'),
});

// Validation schema for status toggle
const ToggleStatusSchema = z.object({
  active: z.boolean(),
});

// User CRUD routes
router.get('/', 
  validateQuery(PaginationSchema), 
  UserController.getUsers
);

router.get('/:id', 
  validateParams(IdParamSchema), 
  UserController.getUserById
);

router.post('/', 
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  validateBody(CreateUserSchema), 
  UserController.createUser
);

router.put('/:id', 
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(IdParamSchema),
  validateBody(UpdateUserSchema), 
  UserController.updateUser
);

router.patch('/:id/status', 
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(IdParamSchema),
  validateBody(ToggleStatusSchema), 
  UserController.toggleUserStatus
);

router.delete('/:id', 
  authenticateToken,
  requireRole(['ADMIN']),
  validateParams(IdParamSchema), 
  UserController.deleteUser
);

export default router;