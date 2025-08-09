import { Router } from 'express';
import { FamilyController } from '../controllers/FamilyController';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

// All family endpoints require authentication
router.use(authMiddleware.verifyToken);

// Family management endpoints
router.post('/', FamilyController.createFamily);
router.post('/members', FamilyController.addFamilyMember);
router.get('/members', FamilyController.getFamilyMembers);
router.get('/members/:memberId', FamilyController.switchMember);
router.put('/members/:memberId', FamilyController.updateMemberProfile);
router.get('/summary', FamilyController.getFamilyHealthSummary);

export default router;