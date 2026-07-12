const express = require('express');
const router = express.Router();
const cc = require('../controllers/courseController');
const lc = require('../controllers/lessonController');
const { protect, optionalAuth } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { attachSchoolFilter } = require('../middlewares/school');
const { optionalUpload } = require('../middlewares/upload');

router.get('/', optionalAuth, cc.list);
router.get('/mine', protect, requireRole('instructor', 'admin'), cc.instructorCourses);
router.get('/admin/all', protect, requireRole('admin'), attachSchoolFilter, cc.adminList);
router.get('/:id', optionalAuth, cc.getOne);
router.post('/', protect, requireRole('instructor', 'admin'), optionalUpload('coverImage'), cc.create);
router.put('/:id', protect, requireRole('instructor', 'admin'), optionalUpload('coverImage'), cc.update);
router.delete('/:id', protect, requireRole('instructor', 'admin'), cc.delete);
router.patch('/:id/publish', protect, requireRole('instructor', 'admin'), cc.publish);
router.post('/:id/modules', protect, requireRole('instructor', 'admin'), cc.addModule);

router.post('/:courseId/lessons', protect, requireRole('instructor', 'admin'), optionalUpload('file'), lc.create);

const examController = require('../controllers/examController');
router.get('/:courseId/exams', protect, examController.getForCourse);
router.post('/:courseId/exams', protect, requireRole('instructor', 'admin'), examController.create);

module.exports = router;
