const express = require('express');
const router = express.Router();
const cc = require('../controllers/certificateController');
const { protect } = require('../middlewares/auth');

router.get('/verify/:hash', cc.verify);
router.get('/verify/:hash/download', cc.downloadByHash);
router.get('/me', protect, cc.mine);
router.get('/course/:courseId', protect, cc.forCourse);
router.get('/:id/download', protect, cc.downloadAttestation);

module.exports = router;
