const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Server-relative paths (local disk storage in dev, or our own GridFS PDF
// proxy) need the API host prepended; a direct Cloudinary URL is already
// absolute and passes through unchanged.
export const resolveFileUrl = (url) => {
  if (!url) return url;
  return url.startsWith('/uploads/') || url.startsWith('/files/') ? `${API_BASE}${url}` : url;
};
