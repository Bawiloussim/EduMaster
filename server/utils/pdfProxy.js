const { cloudinary } = require('../middlewares/upload');

// Recovers { resourceType, publicId } from a plain Cloudinary delivery URL —
// needed for PDFs uploaded before we started storing publicId ourselves
// (including old resource_type 'raw' uploads, still blocked by Cloudinary's
// public delivery restriction), so they don't require a re-upload.
const parseCloudinaryUrl = (url) => {
  if (!/^https?:\/\/res\.cloudinary\.com\//.test(url)) return null;
  // Strip our own previously-injected transformation segment, if present,
  // before parsing out the version/public_id.
  const cleaned = url.replace('/upload/fl_attachment:false/', '/upload/');
  const match = cleaned.match(/\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  const resourceType = match[1];
  const publicId = resourceType === 'raw' ? match[2] : match[2].replace(/\.[a-zA-Z0-9]+$/, '');
  return { resourceType, publicId };
};

// Streams a Cloudinary-hosted PDF through our own server instead of the public
// CDN link — Cloudinary blocks/forces-download public PDF delivery by default,
// but an Admin-API signed download (authenticated with our API secret) isn't
// subject to that restriction, so this always works regardless of that setting.
async function streamPdf(res, pdf) {
  let resourceType = 'image';
  let publicId = pdf.publicId;
  if (!publicId) {
    const parsed = parseCloudinaryUrl(pdf.url);
    // Not a Cloudinary URL at all — local storage (dev), already public/inline.
    if (!parsed) return res.redirect(pdf.url);
    resourceType = parsed.resourceType;
    publicId = parsed.publicId;
  }

  const signedUrl = cloudinary.utils.private_download_url(publicId, resourceType === 'raw' ? undefined : 'pdf', {
    resource_type: resourceType,
    type: 'upload',
  });
  const upstream = await fetch(signedUrl);
  if (!upstream.ok) return res.status(502).json({ success: false, message: 'Document indisponible' });

  res.setHeader('Content-Type', 'application/pdf');
  res.send(Buffer.from(await upstream.arrayBuffer()));
}

module.exports = { streamPdf };
