import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, getMe, updateMe, verifyOtp, toggle2fa, forgotPassword, validateResetToken, resetPassword } from '../controllers/auth';
import { authenticate } from '../middlewares/authenticate';

const router = Router();

// Only credential-guessing endpoints get the strict limiter. Session checks
// (/me) must not share this budget — every page load calls /me, so a handful
// of navigations would otherwise exhaust it and force-log-out a valid user.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many requests, please try again later' },
});

router.post('/register', credentialLimiter, register);
router.post('/login', credentialLimiter, login);
router.post('/verify-otp', credentialLimiter, verifyOtp);
router.post('/forgot-password', credentialLimiter, forgotPassword);
router.get('/reset-password/:token', validateResetToken);
router.post('/reset-password/:token', credentialLimiter, resetPassword);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);
router.patch('/2fa/toggle', authenticate, toggle2fa);

export default router;
