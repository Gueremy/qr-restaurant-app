import { Router } from 'express';
import { socketService } from '../index';
import { authenticateToken, requireRole } from '../middleware/auth';
import { ApiResponseUtil } from '../utils/response';

const router = Router();

/**
 * GET /api/socket/stats - Get connection statistics
 * Requires ADMIN or MANAGER role
 */
router.get('/stats', authenticateToken, requireRole(['ADMIN', 'MANAGER']), (req, res) => {
  try {
    const stats = socketService.getConnectionStats();
    return ApiResponseUtil.success(res, stats, 'Connection statistics retrieved successfully');
  } catch (error) {
    console.error('Error getting socket stats:', error);
    return ApiResponseUtil.serverError(res, 'Failed to get connection statistics');
  }
});

/**
 * GET /api/socket/users/:role - Get connected users by role
 * Requires ADMIN or MANAGER role
 */
router.get('/users/:role', authenticateToken, requireRole(['ADMIN', 'MANAGER']), (req, res) => {
  try {
    const { role } = req.params;
    const users = socketService.getConnectedUsersByRole(role.toUpperCase());
    return ApiResponseUtil.success(res, users, `Connected ${role} users retrieved successfully`);
  } catch (error) {
    console.error('Error getting connected users:', error);
    return ApiResponseUtil.serverError(res, 'Failed to get connected users');
  }
});

/**
 * POST /api/socket/notify/emergency - Send emergency notification
 * Requires ADMIN or MANAGER role
 */
router.post('/notify/emergency', authenticateToken, requireRole(['ADMIN', 'MANAGER']), (req, res) => {
  try {
    const { message, data } = req.body;
    
    if (!message) {
      return ApiResponseUtil.error(res, 'Message is required');
    }

    socketService.notifyEmergency(message, data);
    return ApiResponseUtil.success(res, null, 'Emergency notification sent successfully');
  } catch (error) {
    console.error('Error sending emergency notification:', error);
    return ApiResponseUtil.serverError(res, 'Failed to send emergency notification');
  }
});

/**
 * POST /api/socket/notify/table/:tableId - Send notification to specific table
 * Requires WAITER, ADMIN or MANAGER role
 */
router.post('/notify/table/:tableId', authenticateToken, requireRole(['WAITER', 'ADMIN', 'MANAGER']), (req, res) => {
  try {
    const { tableId } = req.params;
    const { message, data } = req.body;
    
    if (!message) {
      return ApiResponseUtil.error(res, 'Message is required');
    }

    socketService.notifyTable(tableId, message, data);
    return ApiResponseUtil.success(res, null, `Notification sent to table ${tableId} successfully`);
  } catch (error) {
    console.error('Error sending table notification:', error);
    return ApiResponseUtil.serverError(res, 'Failed to send table notification');
  }
});

/**
 * POST /api/socket/notify/low-stock - Send low stock notification
 * Requires ADMIN or MANAGER role
 */
router.post('/notify/low-stock', authenticateToken, requireRole(['ADMIN', 'MANAGER']), (req, res) => {
  try {
    const { product } = req.body;
    
    if (!product || !product.name || product.stock === undefined) {
      return ApiResponseUtil.error(res, 'Product with name and stock is required');
    }

    socketService.notifyLowStock(product);
    return ApiResponseUtil.success(res, null, 'Low stock notification sent successfully');
  } catch (error) {
    console.error('Error sending low stock notification:', error);
    return ApiResponseUtil.serverError(res, 'Failed to send low stock notification');
  }
});

export default router;