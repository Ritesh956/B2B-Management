import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import {
  getMonthlySummary,
  getVendorSpend,
  getInvoiceAging,
  exportMonthlyPdf,
} from '../controllers/reports';

const router = Router();

router.use(authenticate);
router.use(authorize([Role.FINANCE, Role.ADMIN]));

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many requests, please try again later' },
});

router.get('/monthly-summary', getMonthlySummary);
router.get('/vendor-spend', getVendorSpend);
router.get('/invoice-aging', getInvoiceAging);
router.get('/export/monthly-pdf', exportLimiter, exportMonthlyPdf);

export default router;
