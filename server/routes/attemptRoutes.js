const express = require('express');
const router = express.Router();
const ac = require('../controllers/attemptController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.patch('/:attemptId/save', protect, ac.save);
router.patch('/:attemptId/focus-lost', protect, ac.focusLost);
router.post('/:attemptId/submit', protect, ac.submit);
router.get('/:resultId', protect, ac.getResult);
router.get('/mine/all', protect, ac.myResults);
router.patch('/:resultId/grade', protect, requireRole('instructor', 'admin'), ac.gradeOpenQuestion);

module.exports = router;
