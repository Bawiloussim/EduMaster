const express = require('express');
const router = express.Router();
const dc = require('../controllers/dashboardController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.get('/student', protect, requireRole('student'), dc.student);
router.get('/instructor', protect, requireRole('instructor', 'admin'), dc.instructor);
router.get('/admin', protect, requireRole('admin'), dc.admin);

module.exports = router;
