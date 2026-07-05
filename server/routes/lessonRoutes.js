const express = require('express');
const router = express.Router();
const lc = require('../controllers/lessonController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { optionalUpload } = require('../middlewares/upload');

router.put('/:id', protect, requireRole('instructor', 'admin'), optionalUpload('pdfFile'), lc.update);
router.delete('/:id', protect, requireRole('instructor', 'admin'), lc.delete);
router.patch('/reorder', protect, requireRole('instructor', 'admin'), lc.reorder);

module.exports = router;
