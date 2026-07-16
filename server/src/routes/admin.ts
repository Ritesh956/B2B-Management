import { Router } from 'express';
import { getDeletedItems, restoreItem, deleteItem } from '../controllers/admin';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorize([Role.ADMIN]));

router.get('/deleted-items', getDeletedItems);
router.patch('/restore', restoreItem);
router.delete('/item', deleteItem); // Generic soft delete for ease of use in UI

export default router;
