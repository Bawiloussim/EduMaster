const mongoose = require('mongoose');

// PDFs that exceed Cloudinary's per-file size cap on our plan are stored
// directly in MongoDB (GridFS) instead — chunked automatically by the driver,
// so it isn't bound by the 16MB BSON document limit either. Reads always go
// through our own authenticated proxy (see routes/fileRoutes.js and the
// lesson/programme download actions), never a public link, since GridFS has
// no CDN of its own.
let bucket;
const getBucket = () => {
  if (!bucket) bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'files' });
  return bucket;
};

const saveToGridFS = (buffer, filename, contentType) => new Promise((resolve, reject) => {
  const uploadStream = getBucket().openUploadStream(filename, { contentType });
  uploadStream.on('error', reject);
  uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
  uploadStream.end(buffer);
});

const streamFromGridFS = (res, fileId, contentType) => new Promise((resolve) => {
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  let downloadStream;
  try {
    downloadStream = getBucket().openDownloadStream(new mongoose.Types.ObjectId(fileId));
  } catch {
    res.status(404).json({ success: false, message: 'Fichier introuvable' });
    return resolve();
  }
  downloadStream.on('error', () => {
    if (!res.headersSent) res.status(404).json({ success: false, message: 'Fichier introuvable' });
    resolve();
  });
  downloadStream.on('end', resolve);
  downloadStream.pipe(res);
});

const deleteFromGridFS = (fileId) => getBucket().delete(new mongoose.Types.ObjectId(fileId)).catch(() => {});

module.exports = { saveToGridFS, streamFromGridFS, deleteFromGridFS };
