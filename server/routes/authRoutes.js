const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const { upload } = require('../middlewares/upload');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.post('/refresh', auth.refresh);
router.get('/me', protect, auth.getMe);
router.put('/profile', protect, upload.single('avatar'), auth.updateProfile);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);

module.exports = router;
