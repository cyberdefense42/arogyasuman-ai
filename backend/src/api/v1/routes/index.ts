import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../../../config';
import { uploadRouter } from './upload';
import { reportsRouter } from './reports';
import { healthRouter } from './health';
import { adminRouter } from './admin';
import { authRouter } from './auth';
import chatRouter from './chat';
import timelineRouter from './timeline';
import familyRouter from './family';

const router = Router();

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimit.windowMs,
  max: config.security.rateLimit.max,
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(apiLimiter);

// API Documentation
router.get('/', (req, res) => {
  res.json({
    name: 'HealthScan AI API',
    version: '1.0.0',
    description: 'Enterprise-grade health report analysis API',
    endpoints: {
      health: '/health',
      upload: '/upload',
      reports: '/reports',
      admin: '/admin',
      auth: '/auth',
      chat: '/chat',
      timeline: '/timeline',
      family: '/family'
    },
    documentation: '/docs'
  });
});

// Mount route modules
router.use('/upload', uploadRouter);
router.use('/reports', reportsRouter);
router.use('/health', healthRouter);
router.use('/admin', adminRouter);
router.use('/auth', authRouter);
router.use('/chat', chatRouter);
router.use('/timeline', timelineRouter);
router.use('/family', familyRouter);

export { router as apiRouter };