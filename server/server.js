require('dotenv').config();
require('express-async-errors');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

connectDB();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve uploaded files with CORS headers so the frontend can embed them
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:5173');
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

app.get('/api/health', (req, res) => res.json({ success: true, message: 'EduMaster API running' }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
