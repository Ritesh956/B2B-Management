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
import { uploadInvoicePdf } from '../config/storage';

const router = Router();

router.use(authenticate);

router.post('/', authorize([Role.VENDOR]), uploadInvoicePdf.single('invoicePdf'), submitInvoice);
router.get('/', listInvoices);
router.get('/export', exportInvoices);
// FINANCE or ADMIN — consistent with the PO approval chain, where ADMIN can
// act in place of an unavailable approver.
router.patch('/bulk', authorize([Role.FINANCE, Role.ADMIN]), bulkApproveInvoices);
router.get('/:id', getInvoiceById);
router.patch('/:id/approve', authorize([Role.FINANCE, Role.ADMIN]), approveInvoice);
router.patch('/:id/pay', authorize([Role.FINANCE, Role.ADMIN]), payInvoice);

export default router;
