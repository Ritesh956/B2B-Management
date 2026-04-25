import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { getDashboardStats } from '../controllers/dashboard';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);

export default router;
