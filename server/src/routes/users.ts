import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate } from '../middlewares/authenticate';
import { authorize } from '../middlewares/authorize';
import {
  listUsers,
  inviteUser,
  getInviteToken,
  acceptInvite,
  updateUserRole,
  deactivateUser
} from '../controllers/users';

const router = Router();

// Public routes for accepting invites
router.get('/accept-invite/:token', getInviteToken);
router.post('/accept-invite/:token', acceptInvite);

// Protected routes
router.use(authenticate);
router.get('/', authorize([Role.ADMIN]), listUsers);
router.post('/invite', authorize([Role.ADMIN]), inviteUser);
router.patch('/:id/role', authorize([Role.ADMIN]), updateUserRole);
router.post('/:id/deactivate', authorize([Role.ADMIN]), deactivateUser);

export default router;
