const express = require('express');
const router = express.Router();
const ec = require('../controllers/enrollmentController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.post('/', protect, requireRole('student'), ec.enroll);
router.get('/', protect, requireRole('instructor', 'admin'), ec.listForCourse);
router.get('/me', protect, ec.myEnrollments);
router.get('/course/:courseId', protect, ec.getEnrollment);
router.patch('/:id/lesson', protect, requireRole('student'), ec.markLesson);

module.exports = router;
