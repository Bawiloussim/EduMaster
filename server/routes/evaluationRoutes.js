const express = require('express');
const router = express.Router();
const ec = require('../controllers/evaluationController');
const { protect } = require('../middlewares/auth');
const requireRole = require('../middlewares/role');
const { optionalUpload } = require('../middlewares/upload');

// Per course
router.get('/course/:courseId', protect, ec.listForCourse);
router.post('/course/:courseId', protect, requireRole('instructor', 'admin'), ec.create);

// Specific evaluation
router.delete('/:id', protect, requireRole('instructor', 'admin'), ec.delete);
router.post('/:id/correction', protect, requireRole('instructor', 'admin'), optionalUpload('correctionFile'), ec.uploadCorrection);

// Grades
router.get('/:id/grades', protect, requireRole('instructor', 'admin'), ec.getGrades);
router.post('/:id/grades', protect, requireRole('instructor', 'admin'), ec.saveGrades);

// Student: all my evaluations (interrogations/devoirs/compositions) for my classe
router.get('/me', protect, requireRole('student'), ec.myEvaluations);

// Bulletin
router.get('/bulletin/:trimestre/me', protect, requireRole('student'), ec.myBulletin);
router.get('/bulletin/:trimestre/student/:studentId', protect, requireRole('instructor', 'admin'), ec.getBulletin);

// Bulletin PDF
router.get('/bulletin/:trimestre/pdf/me', protect, requireRole('student'), ec.myBulletinPDF);
router.get('/bulletin/:trimestre/pdf/student/:studentId', protect, requireRole('instructor', 'admin'), ec.getBulletinPDF);

module.exports = router;
