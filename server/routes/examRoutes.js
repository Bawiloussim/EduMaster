const express = require('express');
const router = express.Router();
const ec = require('../controllers/examController');
const ac = require('../controllers/attemptController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.get('/:id', protect, ec.getOne);
router.put('/:id', protect, requireRole('instructor', 'admin'), ec.update);
router.delete('/:id', protect, requireRole('instructor', 'admin'), ec.delete);

router.post('/:id/questions', protect, requireRole('instructor', 'admin'), ec.addQuestion);
router.put('/:id/questions/:questionId', protect, requireRole('instructor', 'admin'), ec.updateQuestion);
router.delete('/:id/questions/:questionId', protect, requireRole('instructor', 'admin'), ec.deleteQuestion);

router.post('/:examId/start', protect, requireRole('student'), ac.start);
router.get('/:examId/results', protect, requireRole('instructor', 'admin'), ac.instructorResults);

module.exports = router;
