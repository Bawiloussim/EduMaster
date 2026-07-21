const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const { saveToGridFS, deleteFromGridFS } = require('../utils/gridfs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name';

// Images only — PDFs never reach this storage engine (see HybridStorage).
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'edumaster',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  }),
});

const localDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const imageStorage = useCloudinary ? cloudinaryStorage : localDiskStorage;

// Routes every upload by mimetype: PDFs go to MongoDB (GridFS), which has no
// per-file size cap worth worrying about here, since Cloudinary's own plan
// caps any single upload at 10MB regardless of resource_type — confirmed
// directly against the account, including with chunked uploads. Images stay
// on Cloudinary (or local disk in dev), both well under that cap in practice.
// GridFS files still count against the MongoDB Atlas cluster's own overall
// storage quota, so this trades a per-file cap for an aggregate one instead.
class HybridStorage {
  _handleFile(req, file, cb) {
    if (file.mimetype !== 'application/pdf') return imageStorage._handleFile(req, file, cb);

    const chunks = [];
    file.stream.on('data', (c) => chunks.push(c));
    file.stream.on('error', cb);
    file.stream.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        const gridfsId = await saveToGridFS(buffer, file.originalname, 'application/pdf');
        cb(null, { gridfsId, size: buffer.length });
      } catch (e) { cb(e); }
    });
  }

  _removeFile(req, file, cb) {
    if (file.gridfsId) return deleteFromGridFS(file.gridfsId).then(() => cb(null)).catch(cb);
    if (imageStorage._removeFile) return imageStorage._removeFile(req, file, cb);
    cb(null);
  }
}

const fileFilter = (req, file, cb) => {
  // Busboy decodes the multipart filename header as latin1 by default, while
  // browsers send it UTF-8-encoded — re-decode so accented names aren't mojibake.
  file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou PDF.'));
};

const upload = multer({
  storage: new HybridStorage(),
  // Generous enough for scanned course PDFs; images still effectively cap out
  // around Cloudinary's own 10MB-per-file limit regardless of this number.
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter,
});

// For files we only need to read once (e.g. a PDF handed to Claude for
// extraction) and never store — kept in memory, never touches Cloudinary/disk.
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Seuls les fichiers PDF sont acceptés.'));
  },
});

// Returns the public URL of an uploaded file. GridFS-stored PDFs have no
// public URL of their own — this points at our own authenticated proxy
// instead (see routes/fileRoutes.js), same shape as the local-disk fallback.
const getFileUrl = (file) => {
  if (!file) return '';
  if (file.gridfsId) return `/files/pdf/${file.gridfsId}`;
  if (useCloudinary) return file.secure_url || file.path;
  // Local: serve via /uploads/filename
  return `/uploads/${file.filename}`;
};

// Persists an in-memory PDF buffer in GridFS — used when we need the raw
// bytes for something else first (e.g. handing a programme PDF to Claude for
// extraction) and only decide to keep a permanent, downloadable copy
// afterward, from that same single upload.
const saveBuffer = async (buffer, originalname) => {
  const gridfsId = await saveToGridFS(buffer, originalname, 'application/pdf');
  return { url: `/files/pdf/${gridfsId}`, gridfsId, publicId: '', name: originalname };
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

module.exports = { upload, uploadMemory, cloudinary, getFileUrl, optionalUpload, optionalUploadMultiple, useCloudinary, saveBuffer };
