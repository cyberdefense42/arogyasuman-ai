import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

/**
 * @route POST /api/v1/auth/sync
 * @desc Sync Firebase user with database
 * @access Public (used during login)
 */
router.post('/sync', AuthController.syncUser);

/**
 * @route GET /api/v1/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authMiddleware.verifyToken, AuthController.getProfile);

/**
 * @route PUT /api/v1/auth/profile
 * @desc Update current user profile
 * @access Private
 */
router.put('/profile', authMiddleware.verifyToken, AuthController.updateProfile);

export { router as authRouter };