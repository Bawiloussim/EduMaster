const fs = require('fs/promises');
const path = require('path');
const http = require('http');
const https = require('https');

// Global fetch() (undici) throws "Promise.withResolvers is not a function"
// on some Node 20.x builds — use the plain http/https client instead.
function fetchBuffer(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

// A school logo is stored as either a Cloudinary URL or a local "/uploads/xxx"
// path (see middlewares/upload.js#getFileUrl) — load either into a buffer a
// pdfkit doc.image() call can embed. Returns null (never throws) so a school
// without a logo, or a broken/unreachable one, just renders without one.
async function loadImageBuffer(url) {
  if (!url) return null;
  try {
    if (/^https?:\/\//i.test(url)) return await fetchBuffer(url);
    return await fs.readFile(path.join(__dirname, '../uploads', path.basename(url)));
  } catch {
    return null;
  }
}

module.exports = { loadImageBuffer };
