import { Router } from 'express';
import { TableController } from '../controllers/tableController';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { 
  CreateTableSchema, 
  UpdateTableSchema, 
  PaginationSchema 
} from '../types';
import { z } from 'zod';

const router = Router();

// Validation schemas for params
const IdParamSchema = z.object({
  id: z.string().cuid('Invalid table ID format'),
});

const NumberParamSchema = z.object({
  number: z.string().regex(/^\d+$/, 'Table number must be a valid number'),
});

const StatusUpdateSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'OUT_OF_SERVICE']),
});

// Table CRUD routes
router.get('/', 
  validateQuery(PaginationSchema), 
  TableController.getTables
);

router.get('/available', 
  TableController.getAvailableTables
);

router.get('/:id', 
  validateParams(IdParamSchema), 
  TableController.getTableById
);

router.get('/number/:number', 
  validateParams(NumberParamSchema), 
  TableController.getTableByNumber
);

router.post('/', 
  validateBody(CreateTableSchema), 
  TableController.createTable
);

router.put('/:id', 
  validateParams(IdParamSchema),
  validateBody(UpdateTableSchema), 
  TableController.updateTable
);

router.patch('/:id/status', 
  validateParams(IdParamSchema),
  validateBody(StatusUpdateSchema), 
  TableController.updateTableStatus
);

router.delete('/:id', 
  validateParams(IdParamSchema), 
  TableController.deleteTable
);

router.post('/:id/qr', 
  validateParams(IdParamSchema), 
  TableController.generateQR
);

export default router;