import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createVendor, listVendors, getVendor, updateVendorStatus, getVendorPerformance, updateVendorPerformanceScore, exportVendors, bulkUpdateVendors, bulkExportVendors } from '../controllers/vendors';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { upload } from '../config/s3';
import { Role } from '@prisma/client';

const router = Router();

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' },
});

router.use(authenticate);
router.post('/', authorize([Role.PROCUREMENT, Role.ADMIN]), upload.array('documents', 5), createVendor);
router.get('/', listVendors);
router.get('/export', exportLimiter, exportVendors);
router.get('/performance', authorize([Role.ADMIN, Role.PROCUREMENT, Role.MANAGER, Role.FINANCE]), getVendorPerformance);
router.patch('/:id/performance', authorize([Role.ADMIN]), updateVendorPerformanceScore);
router.patch('/:id/performance-score', authorize([Role.ADMIN]), updateVendorPerformanceScore);
router.patch('/bulk', authorize([Role.ADMIN]), bulkUpdateVendors);
router.post('/bulk-export', exportLimiter, bulkExportVendors);
router.get('/:id', getVendor);
router.patch('/:id/status', authorize([Role.ADMIN]), updateVendorStatus);

export default router;
