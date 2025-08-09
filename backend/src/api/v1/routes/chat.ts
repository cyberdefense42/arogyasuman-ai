import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

// All chat endpoints require authentication
router.use(authMiddleware.verifyToken);

// Chat endpoints
router.post('/message', ChatController.sendMessage);
router.get('/history/:sessionId', ChatController.getChatHistory);
router.get('/insights', ChatController.getHealthInsights);

export default router;