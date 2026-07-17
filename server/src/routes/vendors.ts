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

// The vendor directory (listing/reading/exporting other vendors) is a staff
// tool — vendors manage their own record through /api/v1/vendor/profile, not
// here. Gate the whole resource to staff roles by default so new routes
// don't accidentally launch unscoped; ADMIN-only actions tighten further.
const STAFF_ROLES = [Role.ADMIN, Role.PROCUREMENT, Role.MANAGER, Role.FINANCE];

router.use(authenticate);
router.use(authorize(STAFF_ROLES));

router.post('/', authorize([Role.PROCUREMENT, Role.ADMIN]), upload.array('documents', 5), createVendor);
router.get('/', listVendors);
router.get('/export', exportLimiter, exportVendors);
router.get('/performance', getVendorPerformance);
router.patch('/:id/performance', authorize([Role.ADMIN]), updateVendorPerformanceScore);
router.patch('/:id/performance-score', authorize([Role.ADMIN]), updateVendorPerformanceScore);
router.patch('/bulk', authorize([Role.ADMIN]), bulkUpdateVendors);
router.post('/bulk-export', exportLimiter, bulkExportVendors);
router.get('/:id', getVendor);
router.patch('/:id/status', authorize([Role.ADMIN]), updateVendorStatus);

export default router;
