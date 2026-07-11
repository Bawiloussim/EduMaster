const express = require('express');
const router = express.Router();
const ac = require('../controllers/adminController');
const pc = require('../controllers/palmaresController');
const anc = require('../controllers/announcementController');
const ic = require('../controllers/importController');
const csvUpload = require('../middlewares/csvUpload');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');

router.use(protect, requireRole('admin'));

router.get('/users', ac.adminList);
router.patch('/users/:id/role', ac.updateUserRole);
router.get('/instructors', ac.listInstructors);
router.get('/students', ac.listStudents);
router.get('/palmares', pc.getPalmares);
router.get('/classes', ac.classesOverview);
router.post('/announcements', anc.create);
router.get('/announcements', anc.list);
router.post('/import/students', csvUpload.single('file'), ic.importStudents);

module.exports = router;
