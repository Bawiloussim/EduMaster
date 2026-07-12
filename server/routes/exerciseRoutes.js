const express = require('express');
const router = express.Router();
const ec = require('../controllers/exerciseController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { optionalUpload } = require('../middlewares/upload');

// Instructor
router.post('/lessons/:lessonId', protect, requireRole('instructor', 'admin'), ec.createForLesson);
router.get('/lessons/:lessonId', protect, ec.listForLesson);
router.put('/:id', protect, requireRole('instructor', 'admin'), ec.update);
router.delete('/:id', protect, requireRole('instructor', 'admin'), ec.delete);
router.get('/:id/answers', protect, requireRole('instructor', 'admin'), ec.listAnswers);

// Student
router.post('/:id/answer', protect, requireRole('student'), optionalUpload('answerFile'), ec.submitAnswer);
router.get('/lessons/:lessonId/my-answers', protect, requireRole('student'), ec.myAnswersForLesson);

// Instructor grades open answers
router.patch('/answers/:answerId/grade', protect, requireRole('instructor', 'admin'), ec.gradeAnswer);

module.exports = router;
