import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate';
import { listNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../controllers/notifications';

const router = Router();

router.get('/', authenticate, listNotifications);
// Must be registered before /:id/read or Express matches "read-all" as an :id.
router.patch('/read-all', authenticate, markAllNotificationsAsRead);
router.patch('/:id/read', authenticate, markNotificationAsRead);

export default router;
