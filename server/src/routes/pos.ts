import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { approvePO, createPO, getPOById, getPOPdf, listPOs, rejectPO } from '../controllers/pos';

const router = Router();

router.use(authenticate);

router.post('/', authorize([Role.PROCUREMENT]), createPO);
router.get('/', listPOs);
router.get('/:id/pdf', getPOPdf);
router.get('/:id', getPOById);
router.post('/:id/approve', authorize([Role.MANAGER, Role.FINANCE, Role.ADMIN]), approvePO);
router.post('/:id/reject', authorize([Role.MANAGER, Role.FINANCE, Role.ADMIN]), rejectPO);

export default router;
