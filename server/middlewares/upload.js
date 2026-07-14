const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: 'edumaster',
      // PDFs must go through resource_type 'image' rather than 'raw' — Cloudinary
      // blocks public delivery of raw PDF/ZIP files by default (security setting),
      // but delivers PDFs uploaded as 'image' normally since they're page-rendered.
      resource_type: 'image',
      allowed_formats: isPdf ? ['pdf'] : ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: isPdf ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Busboy decodes the multipart filename header as latin1 by default, while
  // browsers send it UTF-8-encoded — re-decode so accented names aren't mojibake.
  file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF.'));
};

const upload = multer({
  storage: useCloudinary ? cloudinaryStorage : localDiskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

// For files we only need to read once (e.g. a PDF handed to Claude for
// extraction) and never store — kept in memory, never touches Cloudinary/disk.
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Seuls les fichiers PDF sont acceptés.'));
  },
});

// Returns the public URL of an uploaded file
const getFileUrl = (file) => {
  if (!file) return '';
  if (useCloudinary) {
    const url = file.secure_url || file.path;
    // Cloudinary defaults PDF delivery to Content-Disposition: attachment even
    // under resource_type 'image' — force inline so students can read it in
    // the browser's viewer instead of it being downloaded automatically.
    if (file.mimetype === 'application/pdf' && url.includes('/upload/')) {
      return url.replace('/upload/', '/upload/fl_attachment:false/');
    }
    return url;
  }
  // Local: serve via /uploads/filename
  return `/uploads/${file.filename}`;
};

// Middleware that runs multer only when the request is multipart
const optionalUpload = (field) => (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return upload.single(field)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
  next();
};

// Same, but accepts several files under one field name
const optionalUploadMultiple = (field, maxCount = 10) => (req, res, next) => {
  if (req.is('multipart/form-data')) {
    return upload.array(field, maxCount)(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  }
  next();
};

module.exports = { upload, uploadMemory, cloudinary, getFileUrl, optionalUpload, optionalUploadMultiple, useCloudinary };
