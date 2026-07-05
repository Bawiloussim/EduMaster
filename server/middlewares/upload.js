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
      resource_type: isPdf ? 'raw' : 'image',
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
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF.'));
};

const upload = multer({
  storage: useCloudinary ? cloudinaryStorage : localDiskStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter,
});

// Returns the public URL of an uploaded file
const getFileUrl = (file) => {
  if (!file) return '';
  if (useCloudinary) return file.secure_url || file.path;
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

module.exports = { upload, cloudinary, getFileUrl, optionalUpload };
