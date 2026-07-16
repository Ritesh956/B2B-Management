import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { listAuditLogs } from '../controllers/auditLogs';

const router = Router();

// Role/ownership scoping happens inside the controller: ADMIN can browse the
// full log unscoped, everyone else must ask about one specific, owned entity
// (see listAuditLogs for the details) — that's what ActivityFeed relies on.
router.get('/', authenticate, listAuditLogs);

export default router;
