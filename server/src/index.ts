import { env } from './config/env';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { initSocket } from './utils/socket';
import authRoutes from './routes/auth';
import vendorRoutes from './routes/vendors';
import poRoutes from './routes/pos';
import invoiceRoutes from './routes/invoices';
import contractRoutes from './routes/contracts';
import notificationRoutes from './routes/notifications';
import auditLogRoutes from './routes/auditLogs';
import dashboardRoutes from './routes/dashboard';
import searchRoutes from './routes/search';
import vendorPortalRoutes from './routes/vendorPortal';
import reportsRoutes from './routes/reports';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';
import fileRoutes from './routes/files';
import { startContractExpiryJob, runContractExpiryCheck } from './services/contractExpiryJob';
import { initQueues } from './queues';
import { prisma } from './config/prisma';
import { isAllowedOrigin } from './config/cors';
import { isRedisAvailable } from './queues/redisAvailability';

const app = express();
const PORT = process.env.PORT || 5000;

// Render (and any reverse proxy) puts the real client IP in X-Forwarded-For.
// Without this, express-rate-limit keys every request on the proxy's IP, so
// all users share one rate-limit bucket and lock each other out.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // No origin header (e.g. server-to-server, curl) — allow.
    if (!origin) return callback(null, true);
    // Pinned to the real client origins (prod domain + this project's own
    // Vercel previews + local dev) — see config/cors.ts. The old check
    // allowed any *.vercel.app, i.e. anyone's deployment.
    if (isAllowedOrigin(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
// 1mb is generous for every JSON body this API accepts (file uploads go
// through multer, not the JSON parser) and caps memory per request.
app.use(express.json({ limit: '1mb' }));
// Was express.static (no auth at all) - any invoice/contract/vendor-document
// PDF was readable by anyone with (or guessing) its URL. Now goes through
// getUploadedFile, which requires a valid session and checks the requester
// actually owns/may view that specific file.
app.use('/uploads', fileRoutes);

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later' },
});

app.use(generalLimiter);

// API Versioning Redirect (Deprecated Warning)
app.get(/^\/api\//, (req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1/')) {
    return next();
  }
  res.setHeader('Deprecation', 'true');
  const v1Url = req.originalUrl.replace('/api/', '/api/v1/');
  res.redirect(301, v1Url);
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/pos', poRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/vendor', vendorPortalRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/admin', adminRoutes);

// This is Render's configured healthCheckPath (render.yaml) — a slow or
// hanging response here can fail deploy health checks and readiness probes,
// so every check below is timeout-guarded.
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);

app.get('/api/v1/health', async (_req, res) => {
  let dbStatus = 'connected';
  let redisStatus = 'connected';

  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 2000);
  } catch (err) {
    dbStatus = 'error';
  }

  try {
    // A previous version called emailQueue.client.ping() directly — ioredis's
    // default retry strategy means that call never rejects while Redis is
    // unreachable, it just queues and waits, so this endpoint hung forever
    // instead of reporting "degraded". isRedisAvailable() is a bare TCP probe
    // with its own 300ms timeout (see queues/redisAvailability.ts), so it
    // always resolves quickly regardless of ioredis's internal state.
    const reachable = await withTimeout(isRedisAvailable(), 1000);
    if (!reachable) redisStatus = 'error';
  } catch (err) {
    redisStatus = 'error';
  }

  const status = (dbStatus === 'connected' && redisStatus === 'connected') ? 'ok' : 'degraded';

  res.status(200).json({
    status,
    db: dbStatus,
    redis: redisStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

// Start contract expiry cron job
initQueues();
startContractExpiryJob();

// On Render's free tier the instance sleeps between requests, so the 09:00
// cron above frequently never fires — nothing is awake at 09:00. Running the
// same sweep once shortly after every boot means each wake-up (any incoming
// request) also catches up on contract expiry transitions.
setTimeout(() => {
  runContractExpiryCheck().catch((err) => console.error('[ContractExpiryJob] Boot-time sweep failed:', err));
}, 10_000);

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
