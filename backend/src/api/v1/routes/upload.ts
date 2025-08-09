import { Router } from 'express';
import multer from 'multer';
import { config } from '../../../config';
import { UploadController } from '../controllers/UploadController';
import { AppError } from '../../../middlewares/errorHandler';
import { AuthMiddleware } from '../../../middlewares/auth';

const router = Router();
const authMiddleware = AuthMiddleware.getInstance();

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Allow up to 10 files
  },
  fileFilter: (req, file, cb) => {
    if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`Invalid file type: ${file.mimetype}. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`, 400));
    }
  }
});

/**
 * @route POST /api/v1/upload
 * @desc Upload and process health report file(s)
 * @access Private
 */
router.post('/', authMiddleware.verifyToken, upload.array('files', 10), (req, res, next) => {
  // Handle both single and multiple files
  if (req.files && (req.files as Express.Multer.File[]).length > 0) {
    // Multiple files uploaded
    return UploadController.uploadMultipleFiles(req, res, next);
  } else if (req.file) {
    // Single file uploaded (backwards compatibility)
    return UploadController.uploadFile(req, res, next);
  } else {
    return next(new AppError('No files provided', 400));
  }
});

/**
 * @route POST /api/v1/upload/single
 * @desc Upload and process single health report file (backwards compatibility)
 * @access Private
 */
router.post('/single', authMiddleware.verifyToken, upload.single('file'), UploadController.uploadFile);

/**
 * @route GET /api/v1/upload/status/:reportId
 * @desc Get upload processing status
 * @access Private
 */
router.get('/status/:reportId', authMiddleware.verifyToken, UploadController.getUploadStatus);

/**
 * @route GET /api/v1/upload/analysis/:reportId
 * @desc Get formatted, user-friendly analysis report
 * @access Private
 */
router.get('/analysis/:reportId', authMiddleware.verifyToken, UploadController.getFormattedAnalysis);

/**
 * @route GET /api/v1/upload/parameters/:reportId
 * @desc Get all extracted parameters from a report in table format
 * @access Private
 */
router.get('/parameters/:reportId', authMiddleware.verifyToken, UploadController.getReportParameters);

/**
 * @route GET /api/v1/upload/history
 * @desc Get all reports with parameters for historical review
 * @access Private
 */
router.get('/history', authMiddleware.verifyToken, UploadController.getAllReportsWithParameters);

export { router as uploadRouter };