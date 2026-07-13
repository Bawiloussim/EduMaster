const express = require('express');
const router = express.Router();
const cc = require('../controllers/classController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { attachSchoolFilter } = require('../middlewares/school');

router.use(protect, requireRole('admin'), attachSchoolFilter);

router.get('/', cc.list);
router.post('/', cc.create);
router.patch('/:id', cc.update);
router.delete('/:id', cc.remove);

router.get('/:classId/courses', cc.listCourses);
router.post('/:classId/courses', cc.assignCourse);
router.delete('/:classId/courses/:courseId', cc.unassignCourse);

module.exports = router;
