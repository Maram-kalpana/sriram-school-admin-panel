const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const env = require('./config/env');
const auth = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.resolve(env.uploadDir)));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Scholar Store admin API is running',
    data: { env: env.nodeEnv },
  });
});

app.use('/api/auth', authRoutes);

app.use('/api/admin', auth);
app.use('/api/admin/students', studentsRoutes);

app.use('/api/admin', (req, res) => {
  res.status(404).json({ success: false, message: 'Admin route not found' });
});

app.use(errorHandler);

module.exports = app;
