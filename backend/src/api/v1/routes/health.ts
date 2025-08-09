import { Router } from 'express';
import { HealthController } from '../controllers/HealthController';

const router = Router();

/**
 * @route GET /api/v1/health
 * @desc System health check
 * @access Public
 */
router.get('/', HealthController.healthCheck);

/**
 * @route GET /api/v1/health/detailed
 * @desc Detailed system health with all services
 * @access Public
 */
router.get('/detailed', HealthController.detailedHealthCheck);

/**
 * @route GET /api/v1/health/services
 * @desc Individual service health status
 * @access Public
 */
router.get('/services', HealthController.servicesHealthCheck);

export { router as healthRouter };