import { Router } from 'express';
import { DailyCloseController } from '../controllers/dailyCloseController';
import { validateBody, validateQuery } from '../middleware/validation';
import { authenticateToken, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const ExecuteCloseSchema = z.object({
  notes: z.string().optional(),
  expenses: z.number().min(0, 'Expenses must be positive').default(0),
});

const HistoryQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// Todas las rutas requieren autenticación y rol de ADMIN o MANAGER
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'MANAGER']));

// GET /api/daily-close/status - Verificar estado del cierre
router.get('/status', DailyCloseController.getCloseStatus);

// GET /api/daily-close/pre-validation - Validaciones pre-cierre
router.get('/pre-validation', DailyCloseController.preCloseValidation);

// POST /api/daily-close - Ejecutar cierre diario
router.post('/', 
  validateBody(ExecuteCloseSchema), 
  DailyCloseController.executeDailyClose
);

// GET /api/daily-close/history - Historial de cierres
router.get('/history', 
  validateQuery(HistoryQuerySchema), 
  DailyCloseController.getCloseHistory
);

export default router;