import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Role } from '@prisma/client';
import { uploadContractPdf } from '../config/storage';
import {
  createContract,
  listContracts,
  getContractById,
  updateContractStatus,
} from '../controllers/contracts';

const router = Router();

// POST /api/contracts - Create contract with PDF upload (ADMIN/PROCUREMENT only)
router.post(
  '/',
  authenticate,
  authorize([Role.ADMIN, Role.PROCUREMENT]),
  uploadContractPdf.single('contractPdf'),
  createContract
);

// GET /api/contracts - List contracts with pagination
router.get('/', authenticate, listContracts);

// GET /api/contracts/:id - Get contract details
router.get('/:id', authenticate, getContractById);

// PATCH /api/contracts/:id - Update contract status (ADMIN/PROCUREMENT only)
router.patch(
  '/:id',
  authenticate,
  authorize([Role.ADMIN, Role.PROCUREMENT]),
  updateContractStatus
);

export default router;
