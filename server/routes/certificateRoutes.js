const express = require('express');
const router = express.Router();
const cc = require('../controllers/certificateController');
const { protect } = require('../middlewares/auth');

router.get('/verify/:hash', cc.verify);
router.get('/me', protect, cc.mine);
router.get('/:id/download', protect, cc.download);

module.exports = router;
