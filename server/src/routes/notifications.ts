import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { listNotifications, markNotificationAsRead } from '../controllers/notifications';

const router = Router();

router.get('/', authenticate, listNotifications);
router.patch('/:id/read', authenticate, markNotificationAsRead);

export default router;
