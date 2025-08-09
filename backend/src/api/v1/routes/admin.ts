import { Router } from 'express';
import { AdminController } from '../controllers/AdminController';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

// All admin routes require authentication and admin role
const requireAdmin = [
  authMiddleware.verifyToken,
  authMiddleware.requireRole(['admin'])
];

/**
 * @route GET /api/v1/admin/users
 * @desc Get all users with pagination
 * @access Admin only
 */
router.get('/users', ...requireAdmin, AdminController.getAllUsers);

/**
 * @route GET /api/v1/admin/users/:userId
 * @desc Get specific user details with all their data
 * @access Admin only
 */
router.get('/users/:userId', ...requireAdmin, AdminController.getUserDetails);

/**
 * @route PUT /api/v1/admin/users/:userId/role
 * @desc Update user role
 * @access Admin only
 */
router.put('/users/:userId/role', ...requireAdmin, AdminController.updateUserRole);

/**
 * @route DELETE /api/v1/admin/users/:userId
 * @desc Delete user and all their data
 * @access Admin only
 */
router.delete('/users/:userId', ...requireAdmin, AdminController.deleteUser);

/**
 * @route GET /api/v1/admin/reports
 * @desc Get all reports across all users
 * @access Admin only
 */
router.get('/reports', ...requireAdmin, AdminController.getAllReports);

/**
 * @route GET /api/v1/admin/stats
 * @desc Get system statistics
 * @access Admin only
 */
router.get('/stats', ...requireAdmin, AdminController.getSystemStats);

export { router as adminRouter };