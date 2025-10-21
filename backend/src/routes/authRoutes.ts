import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { UserController } from '../controllers/userController';
import { validateBody } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { LoginSchema } from '../types';

const router = Router();

// POST /api/auth/login - Login con redirección por roles
router.post('/login', validateBody(LoginSchema), AuthController.login);

// POST /api/auth/logout - Logout
router.post('/logout', AuthController.logout);

// GET /api/auth/me - Obtener información del usuario actual (requiere autenticación)
router.get('/me', authenticateToken, AuthController.getCurrentUser);

// GET /api/auth/profile - Profile route (protected) - mantener compatibilidad
router.get('/profile', authenticateToken, UserController.getProfile);

// POST /api/auth/change-password - Cambiar contraseña (requiere autenticación)
router.post('/change-password', authenticateToken, AuthController.changePassword);

// GET /api/auth/roles - Obtener roles disponibles (solo admins)
router.get('/roles', authenticateToken, requireRole(['ADMIN']), AuthController.getRoles);

// POST /api/auth/validate-token - Validar token JWT
router.post('/validate-token', AuthController.validateToken);

export default router;