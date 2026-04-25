import { Router } from 'express';
import { createVendor, listVendors, getVendor, updateVendorStatus, getVendorPerformance, updateVendorPerformanceScore } from '../controllers/vendors';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { upload } from '../config/s3';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.post('/', authorize([Role.PROCUREMENT, Role.ADMIN]), upload.array('documents', 5), createVendor);
router.get('/', listVendors);
router.get('/performance', authorize([Role.ADMIN]), getVendorPerformance);
router.patch('/:id/performance-score', authorize([Role.ADMIN]), updateVendorPerformanceScore);
router.get('/:id', getVendor);
router.patch('/:id/status', authorize([Role.ADMIN]), updateVendorStatus);

export default router;
