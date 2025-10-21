import { Router } from 'express';
import { ReportsController } from '../controllers/reportsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación y rol de ADMIN o MANAGER
router.use(authenticateToken);
router.use(requireRole(['ADMIN', 'MANAGER']));

// GET /api/reports/sales - Reporte de ventas
router.get('/sales', ReportsController.getSalesReport);

// GET /api/reports/analytics - Analytics y tendencias
router.get('/analytics', ReportsController.getAnalytics);

// GET /api/reports/export/excel - Exportar reporte a Excel
router.get('/export/excel', ReportsController.exportToExcel);

// GET /api/reports/export/pdf - Exportar reporte a PDF
router.get('/export/pdf', ReportsController.exportToPDF);

export default router;