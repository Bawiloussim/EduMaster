const express = require('express');
const router = express.Router();
const sc = require('../controllers/schoolController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { upload } = require('../middlewares/upload');

router.get('/public', sc.publicList);

// Principal self-service — mounted before the superadmin-only block below,
// since Express matches routes in registration order.
router.get('/me', protect, requireRole('admin'), sc.getMySchool);
router.post('/me', protect, requireRole('admin'), sc.createMySchool);
router.patch('/me', protect, requireRole('admin'), sc.updateMySchool);
router.patch('/me/logo', protect, requireRole('admin'), upload.single('logo'), sc.uploadMySchoolLogo);
router.get('/me/setup-status', protect, requireRole('admin'), sc.getSetupStatus);

router.use(protect, requireRole('superadmin'));

router.get('/', sc.list);
router.post('/', sc.create);
router.patch('/:id', sc.update);
router.patch('/:id/status', sc.setStatus);
router.delete('/:id', sc.remove);

module.exports = router;
