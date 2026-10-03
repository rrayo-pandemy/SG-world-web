/**
 * Content-Type validation middleware (S-07)
 * Rejects POST/PUT/PATCH requests that don't have proper Content-Type
 */
function validateContentType(req, res, next) {
  const stateChangingMethods = ['POST', 'PUT', 'PATCH'];

  if (!stateChangingMethods.includes(req.method)) {
    return next();
  }

  // Skip for file uploads (multipart) and empty bodies
  const contentType = req.headers['content-type'] || '';
  const hasBody = req.headers['content-length'] && req.headers['content-length'] !== '0';

  if (!hasBody) {
    return next();
  }

  // Allow JSON and multipart (file uploads)
  if (
    contentType.includes('application/json') ||
    contentType.includes('multipart/form-data') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    return next();
  }

  return res.status(415).json({
    success: false,
    message: 'Content-Type no soportado. Use application/json',
  });
}

module.exports = validateContentType;
