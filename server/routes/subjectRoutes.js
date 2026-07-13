const express = require('express');
const router = express.Router();
const sc = require('../controllers/subjectController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { attachSchoolFilter } = require('../middlewares/school');

router.use(protect, requireRole('admin'), attachSchoolFilter);

router.get('/', sc.list);
router.post('/', sc.create);
router.patch('/:id', sc.update);
router.delete('/:id', sc.remove);

module.exports = router;
