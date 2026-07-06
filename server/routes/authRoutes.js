const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { upload } = require('../middlewares/upload');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.post('/refresh', auth.refresh);
router.get('/me', protect, auth.getMe);
router.patch('/me/classe', protect, requireRole('student'), auth.setClasse);
router.put('/profile', protect, upload.single('avatar'), auth.updateProfile);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);

module.exports = router;
