const express = require('express');
const router = express.Router();
const nc = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

router.get('/', protect, nc.list);
router.patch('/read-all', protect, nc.readAll);
router.patch('/:id/read', protect, nc.readOne);

module.exports = router;
