import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { listAuditLogs } from '../controllers/auditLogs';

const router = Router();

router.get('/', authenticate, authorize([Role.ADMIN]), listAuditLogs);

export default router;
