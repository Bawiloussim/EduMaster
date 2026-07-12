const express = require('express');
const router = express.Router();
const sc = require('../controllers/schoolController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.get('/public', sc.publicList);

router.use(protect, requireRole('superadmin'));

router.get('/', sc.list);
router.post('/', sc.create);
router.patch('/:id', sc.update);
router.patch('/:id/status', sc.setStatus);
router.delete('/:id', sc.remove);

router.get('/principals/pending', sc.pendingPrincipals);
router.patch('/principals/:id/approve', sc.approvePrincipal);
router.patch('/principals/:id/reject', sc.rejectPrincipal);

module.exports = router;
