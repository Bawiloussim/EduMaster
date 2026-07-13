const express = require('express');
const router = express.Router();
const ac = require('../controllers/adminController');
const pc = require('../controllers/palmaresController');
const anc = require('../controllers/announcementController');
const ic = require('../controllers/importController');
const csvUpload = require('../middlewares/csvUpload');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { attachSchoolFilter } = require('../middlewares/school');

router.use(protect, requireRole('admin'), attachSchoolFilter);

router.get('/users', ac.adminList);
router.patch('/users/:id/role', ac.updateUserRole);

router.get('/instructors', ac.listInstructors);
router.post('/instructors', ac.createInstructor);
router.patch('/instructors/:id', ac.updateInstructor);
router.delete('/instructors/:id', ac.deleteInstructor);
router.patch('/instructors/:id/reset-password', ac.resetInstructorPassword);
router.patch('/instructors/:id/status', ac.toggleInstructorStatus);
router.patch('/instructors/:id/assignments', ac.updateInstructorAssignments);

router.get('/students', ac.listStudents);
router.post('/students', ac.createStudent);
router.patch('/students/:id', ac.updateStudent);
router.delete('/students/:id', ac.deleteStudent);
router.patch('/students/:id/reset-password', ac.resetStudentPassword);
router.patch('/students/:id/status', ac.toggleStudentStatus);

router.get('/palmares', pc.getPalmares);
router.get('/classes', ac.classesOverview);
router.post('/announcements', anc.create);
router.get('/announcements', anc.list);
router.post('/import/students', csvUpload.single('file'), ic.importStudents);
router.post('/import/instructors', csvUpload.single('file'), ic.importInstructors);
router.post('/import/courses', csvUpload.single('file'), ic.importCourses);

module.exports = router;
