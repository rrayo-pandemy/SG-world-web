// Lightweight origin/referer check for state-changing requests
// Enabled in production or when ENABLE_STRICT_ORIGIN=true

function isStateChangingMethod(method) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || '').toUpperCase());
}

function isAllowedOrigin(origin, allowedOrigins = []) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const host = u.origin;
    return allowedOrigins.includes(host);
  } catch (e) {
    return false;
  }
}

module.exports = function originCheck(allowedOrigins) {
  // S-03: Active in ALL environments. Set DISABLE_ORIGIN_CHECK=true to bypass (dev only).
  const disabled = process.env.DISABLE_ORIGIN_CHECK === 'true' && process.env.NODE_ENV !== 'production';

  return (req, res, next) => {
    if (disabled) return next();

    if (!isStateChangingMethod(req.method)) return next();

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (origin && isAllowedOrigin(origin, allowedOrigins)) return next();

    if (referer) {
      try {
        const r = new URL(referer);
        if (allowedOrigins.includes(r.origin)) return next();
      } catch (_e) {}
    }

    return res.status(403).json({ success: false, message: 'Invalid request origin' });
  };
};
