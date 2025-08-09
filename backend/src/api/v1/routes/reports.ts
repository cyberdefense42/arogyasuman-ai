import { Router } from 'express';
import { ReportsController } from '../controllers/ReportsController';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

/**
 * @route GET /api/v1/reports
 * @desc Get paginated list of reports (filtered by user)
 * @access Private
 */
router.get('/', authMiddleware.verifyToken, ReportsController.getReports);

/**
 * @route GET /api/v1/reports/:id
 * @desc Get specific report with analysis
 * @access Private
 */
router.get('/:id', authMiddleware.verifyToken, ReportsController.getReportById);

/**
 * @route DELETE /api/v1/reports/:id
 * @desc Delete a report and its associated data
 * @access Private
 */
router.delete('/:id', authMiddleware.verifyToken, ReportsController.deleteReport);

/**
 * @route GET /api/v1/reports/:id/metrics
 * @desc Get health metrics for a specific report
 * @access Private
 */
router.get('/:id/metrics', authMiddleware.verifyToken, ReportsController.getReportMetrics);

/**
 * @route GET /api/v1/reports/:id/analysis
 * @desc Get AI analysis for a specific report
 * @access Private
 */
router.get('/:id/analysis', authMiddleware.verifyToken, ReportsController.getReportAnalysis);

export { router as reportsRouter };