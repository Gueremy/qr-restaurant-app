import { Router } from 'express';
import { OrderController } from '../controllers/orderController';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  CreateOrderSchema, 
  UpdateOrderSchema, 
  PaginationSchema 
} from '../types';
import { z } from 'zod';

const router = Router();

// Validation schemas for params
const IdParamSchema = z.object({
  id: z.string().min(1, 'Invalid order ID format'),
});

const TableIdParamSchema = z.object({
  tableId: z.string().min(1, 'Invalid table ID format'),
});

// Query schemas
const OrderQuerySchema = PaginationSchema.extend({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
  tableId: z.string().min(1).optional(),
});

const TableOrderQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED']).optional(),
});

// Order CRUD routes
router.get('/', 
  authenticateToken,
  validateQuery(OrderQuerySchema), 
  OrderController.getOrders
);

router.get('/kitchen', 
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER', 'KITCHEN']),
  OrderController.getKitchenOrders
);

router.get('/table/:tableId', 
  authenticateToken,
  validateParams(TableIdParamSchema),
  validateQuery(TableOrderQuerySchema), 
  OrderController.getOrdersByTable
);

router.get('/:id', 
  authenticateToken,
  validateParams(IdParamSchema), 
  OrderController.getOrderById
);

router.post('/', 
  authenticateToken,
  validateBody(CreateOrderSchema), 
  OrderController.createOrder
);

router.put('/:id/status', 
  authenticateToken,
  validateParams(IdParamSchema),
  validateBody(UpdateOrderSchema), 
  OrderController.updateOrderStatus
);

router.delete('/:id', 
  authenticateToken,
  requireRole(['ADMIN', 'MANAGER']),
  validateParams(IdParamSchema), 
  OrderController.cancelOrder
);

export default router;