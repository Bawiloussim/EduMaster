const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPdf = file.mimetype === 'application/pdf';
    return {
      folder: 'edumaster',
      resource_type: isPdf ? 'raw' : 'image',
      allowed_formats: isPdf ? ['pdf'] : ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm'],
      transformation: isPdf ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, '/tmp'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage: process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' ? storage : localStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
});

module.exports = { upload, cloudinary };
