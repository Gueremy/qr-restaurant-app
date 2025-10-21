import { Router } from 'express';
import { IngredientController } from '../controllers/ingredientController';
import { RecipeController } from '../controllers/recipeController';
import { StockController } from '../controllers/stockController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// ===== RUTAS DE INGREDIENTES =====
// Obtener estadísticas de inventario (todos los roles autenticados)
router.get('/stats', IngredientController.getInventoryStats);

// Obtener todos los ingredientes
router.get('/ingredients', IngredientController.getIngredients);

// Obtener ingrediente por ID
router.get('/ingredients/:id', IngredientController.getIngredientById);

// Crear nuevo ingrediente (solo ADMIN y MANAGER)
router.post('/ingredients', requireRole(['ADMIN', 'MANAGER']), IngredientController.createIngredient);

// Actualizar ingrediente (solo ADMIN y MANAGER)
router.put('/ingredients/:id', requireRole(['ADMIN', 'MANAGER']), IngredientController.updateIngredient);

// Eliminar ingrediente (solo ADMIN)
router.delete('/ingredients/:id', requireRole(['ADMIN']), IngredientController.deleteIngredient);

// ===== RUTAS DE RECETAS =====
// Obtener todas las recetas
router.get('/recipes', RecipeController.getRecipes);

// Obtener receta por ID
router.get('/recipes/:id', RecipeController.getRecipeById);

// Crear nueva receta (solo ADMIN, MANAGER y KITCHEN)
router.post('/recipes', requireRole(['ADMIN', 'MANAGER', 'KITCHEN']), RecipeController.createRecipe);

// Actualizar receta (solo ADMIN, MANAGER y KITCHEN)
router.put('/recipes/:id', requireRole(['ADMIN', 'MANAGER', 'KITCHEN']), RecipeController.updateRecipe);

// Eliminar receta (solo ADMIN y MANAGER)
router.delete('/recipes/:id', requireRole(['ADMIN', 'MANAGER']), RecipeController.deleteRecipe);

// Agregar ingrediente a receta (solo ADMIN, MANAGER y KITCHEN)
router.post('/recipes/:id/ingredients', requireRole(['ADMIN', 'MANAGER', 'KITCHEN']), RecipeController.addIngredientToRecipe);

// Actualizar ingrediente en receta (solo ADMIN, MANAGER y KITCHEN)
router.put('/recipes/:id/ingredients/:ingredientId', requireRole(['ADMIN', 'MANAGER', 'KITCHEN']), RecipeController.updateRecipeIngredient);

// Eliminar ingrediente de receta (solo ADMIN, MANAGER y KITCHEN)
router.delete('/recipes/:id/ingredients/:ingredientId', requireRole(['ADMIN', 'MANAGER', 'KITCHEN']), RecipeController.removeIngredientFromRecipe);

// ===== RUTAS DE STOCK =====
// Obtener movimientos de stock
router.get('/stock/movements', StockController.getStockMovements);

// Crear movimiento de stock (solo ADMIN, MANAGER y KITCHEN)
router.post('/stock/movements', requireRole(['ADMIN', 'MANAGER', 'KITCHEN']), StockController.createStockMovement);

// Obtener alertas de stock
router.get('/stock/alerts', StockController.getStockAlerts);

// Marcar alerta como leída
router.patch('/stock/alerts/:id/read', StockController.markAlertAsRead);

// Marcar todas las alertas como leídas
router.patch('/stock/alerts/read-all', StockController.markAllAlertsAsRead);

// Crear alerta manual (solo ADMIN y MANAGER)
router.post('/stock/alerts', requireRole(['ADMIN', 'MANAGER']), StockController.createStockAlert);

// Obtener stock crítico
router.get('/stock/critical', StockController.getCriticalStock);

// Procesar ingredientes de orden (solo KITCHEN)
router.post('/stock/process-order/:orderId', requireRole(['KITCHEN']), StockController.processOrderIngredients);

export default router;