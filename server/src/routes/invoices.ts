import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import {
  approveInvoice,
  getInvoiceById,
  listInvoices,
  payInvoice,
  submitInvoice,
  exportInvoices,
  bulkApproveInvoices,
} from '../controllers/invoices';
import { uploadInvoicePdf } from '../config/s3';

const router = Router();

router.use(authenticate);

router.post('/', authorize([Role.VENDOR]), uploadInvoicePdf.single('invoicePdf'), submitInvoice);
router.get('/', listInvoices);
router.get('/export', exportInvoices);
router.patch('/bulk', authorize([Role.FINANCE]), bulkApproveInvoices);
router.get('/:id', getInvoiceById);
router.patch('/:id/approve', authorize([Role.FINANCE]), approveInvoice);
router.patch('/:id/pay', authorize([Role.FINANCE]), payInvoice);

export default router;
