import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import {
  getVendorDashboard,
  getVendorProfile,
  updateVendorProfile,
} from '../controllers/vendorPortal';

const router = Router();

router.use(authenticate);
router.use(authorize([Role.VENDOR]));

router.get('/dashboard', getVendorDashboard);
router.get('/profile', getVendorProfile);
router.patch('/profile', updateVendorProfile);

export default router;
