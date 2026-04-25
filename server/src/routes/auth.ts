import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/auth';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);

export default router;
