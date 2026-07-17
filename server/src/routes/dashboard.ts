import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { getDashboardStats, getTopVendors, getOldestPendingPO } from '../controllers/dashboard';

const router = Router();

// Company-wide stats (activity feed across all users, top-vendor spend
// rankings, etc.) — staff only. Vendors have their own scoped dashboard at
// GET /api/v1/vendor/dashboard.
const STAFF_ROLES = [Role.ADMIN, Role.FINANCE, Role.PROCUREMENT, Role.MANAGER];

router.use(authenticate);
router.use(authorize(STAFF_ROLES));

router.get('/stats', getDashboardStats);
router.get('/top-vendors', getTopVendors);
router.get('/oldest-pending', getOldestPendingPO);

export default router;
