const multer = require('multer');

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const ok = file.mimetype === 'text/csv' || file.mimetype === EXCEL_MIME
      || name.endsWith('.csv') || name.endsWith('.xlsx');
    if (ok) return cb(null, true);
    cb(new Error('Le fichier doit être un CSV ou un Excel (.xlsx)'));
  },
});

module.exports = csvUpload;
