const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { config } = require('./config');
const { errorHandler } = require('./errors');
const { requireAdmin, originGuard } = require('./middleware/auth');
const adminAuth = require('./routes/adminAuth');
const adminStudents = require('./routes/adminStudents');
const adminCatalog = require('./routes/adminCatalog');
const adminOrders = require('./routes/adminOrders');
const adminDashboard = require('./routes/adminDashboard');
const storefront = require('./routes/storefront');

function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());
  app.use(originGuard);

  if (!fs.existsSync(config.uploadsDir)) fs.mkdirSync(config.uploadsDir, { recursive: true });
  app.use('/uploads', express.static(config.uploadsDir));

  app.get('/api/health', (req, res) => res.json({ data: { ok: true } }));

  app.use('/api/admin/auth', adminAuth);
  app.use('/api/admin/students', requireAdmin, adminStudents);
  app.use('/api/admin', requireAdmin, adminCatalog);
  app.use('/api/admin/orders', requireAdmin, adminOrders);
  app.use('/api/admin', requireAdmin, adminDashboard);
  app.use('/api/storefront', storefront);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });

  const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
