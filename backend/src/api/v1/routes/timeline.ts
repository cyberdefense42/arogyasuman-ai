import { Router } from 'express';
import { TimelineController } from '../controllers/TimelineController';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

// All timeline endpoints require authentication
router.use(authMiddleware.verifyToken);

// Timeline endpoints
router.get('/', TimelineController.getHealthTimeline);
router.get('/metric/:metric', TimelineController.getMetricTrends);
router.get('/health-score', TimelineController.getHealthScore);

export default router;