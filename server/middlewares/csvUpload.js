const multer = require('multer');

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv');
    if (ok) return cb(null, true);
    cb(new Error('Le fichier doit être un CSV'));
  },
});

module.exports = csvUpload;
