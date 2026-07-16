import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { getDashboardStats, getTopVendors, getOldestPendingPO } from '../controllers/dashboard';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/top-vendors', authenticate, getTopVendors);
router.get('/oldest-pending', authenticate, getOldestPendingPO);

export default router;
