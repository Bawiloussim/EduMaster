require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
const configuredClientUrl = process.env.CLIENT_URL?.replace(/\/+$/, '');
const isAllowedOrigin = (origin) =>
  !origin ||
  origin === configuredClientUrl ||
  origin === 'http://localhost:5173' ||
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files with CORS headers so the frontend can embed them
app.use('/uploads', (req, res, next) => {
  if (isAllowedOrigin(req.headers.origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || configuredClientUrl || 'http://localhost:5173');
  }
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Disposition', 'inline');
  next();
}, express.static(path.join(__dirname, 'uploads')));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes' },
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/lessons', require('./routes/lessonRoutes'));
app.use('/api/enrollments', require('./routes/enrollmentRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/attempts', require('./routes/attemptRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/exercises', require('./routes/exerciseRoutes'));
app.use('/api/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

app.get('/api/health', (req, res) => res.json({ success: true, message: 'EduMaster API running' }));

app.use(errorHandler);

module.exports = app;
