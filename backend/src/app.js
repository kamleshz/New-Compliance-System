import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import ccpClientRoutes from './routes/ccpClientRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import clientComplianceStatusRoutes from './routes/clientComplianceStatusRoutes.js';
import clientPortalAssetRoutes from './routes/clientPortalAssetRoutes.js';
import clientPortalDataUploadRoutes from './routes/clientPortalDataUploadRoutes.js';
import clientPurchaseOrderRoutes from './routes/clientPurchaseOrderRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import eprTargetRoutes from './routes/eprTargetRoutes.js';
import errorHandler from './middleware/errorMiddleware.js';

const app = express();

const allowedOrigins = String(
  process.env.CORS_ORIGINS || process.env.FRONTEND_URL || ''
)
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin include health checks and server-to-server calls.
      if (!origin || allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  })
);
app.use(express.json({ limit: '50mb' }));
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/ccp-clients', ccpClientRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client-compliance-status', clientComplianceStatusRoutes);
app.use('/api/client-portal-assets', clientPortalAssetRoutes);
app.use('/api/client-portal-data-uploads', clientPortalDataUploadRoutes);
app.use('/api/client-purchase-orders', clientPurchaseOrderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/epr-target', eprTargetRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

export default app;
