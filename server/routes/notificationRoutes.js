const express = require('express');
const router = express.Router();
const nc = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.get('/', protect, nc.list);
router.patch('/read-all', protect, nc.readAll);
router.patch('/:id/read', protect, nc.readOne);

router.get('/admin/users', protect, requireRole('admin'), nc.adminList);
router.patch('/admin/users/:id/role', protect, requireRole('admin'), nc.updateUserRole);

module.exports = router;
