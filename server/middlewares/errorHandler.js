const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({ success: false, message: messages.join(', ') });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `${field} déjà utilisé` });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }

  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Fichier trop volumineux (40 Mo maximum)'
      : 'Échec du téléversement du fichier';
    return res.status(413).json({ success: false, message });
  }

  // Cloudinary SDK errors (upload rejected: bad format, over its own size cap,
  // etc.) — shaped as { message, http_code }, not a standard Node Error.
  if (err.http_code) {
    return res.status(err.http_code === 400 ? 422 : err.http_code).json({ success: false, message: err.message || 'Échec du téléversement du fichier' });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expiré' });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
  });
};

module.exports = errorHandler;
