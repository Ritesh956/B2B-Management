import { env } from './config/env';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
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
import { startContractExpiryJob } from './services/contractExpiryJob';
import { initQueues } from './queues';
import { prisma } from './config/prisma';

const app = express();
const PORT = process.env.PORT || 5000;

// Render (and any reverse proxy) puts the real client IP in X-Forwarded-For.
// Without this, express-rate-limit keys every request on the proxy's IP, so
// all users share one rate-limit bucket and lock each other out.
app.set('trust proxy', 1);

const staticAllowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // No origin header (e.g. server-to-server, curl) — allow.
    if (!origin) return callback(null, true);
    if (staticAllowedOrigins.includes(origin)) return callback(null, true);
    // Vercel gives every deployment (production alias + each preview) its
    // own *.vercel.app subdomain, so allow the whole domain rather than
    // hardcoding one URL that breaks the next time it's renamed.
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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

import { emailQueue } from './queues/emailQueue'; // Use any queue for redis client

app.get('/api/v1/health', async (_req, res) => {
  let dbStatus = 'connected';
  let redisStatus = 'connected';
  
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'error';
  }

  try {
    const ping = await emailQueue.client.ping();
    if (ping !== 'PONG') throw new Error('Redis ping failed');
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

const httpServer = createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
