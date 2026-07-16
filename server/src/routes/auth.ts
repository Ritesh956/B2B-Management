import { Router } from 'express';
import { register, login, getMe, updateMe, verifyOtp, toggle2fa } from '../controllers/auth';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.post('/verify-otp', verifyOtp);
router.patch('/2fa/toggle', authenticate, toggle2fa);

export default router;
