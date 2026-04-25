import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
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
import { startContractExpiryJob } from './services/contractExpiryJob';
import { initQueues } from './queues';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/pos', poRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/vendor', vendorPortalRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start contract expiry cron job
initQueues();
startContractExpiryJob();

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
