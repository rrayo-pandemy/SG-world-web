const jwt = require('jsonwebtoken');

// Enforce presence of JWT_SECRET to avoid using weak defaults
if (!process.env.JWT_SECRET) {
  throw new Error('Environment variable JWT_SECRET is required. Set JWT_SECRET before starting the server.');
}

function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  if (req && req.cookies && req.cookies.auth_token) return req.cookies.auth_token;
  return null;
}

function authRequired(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token requerido' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    const payload = jwt.verify(token, secret);
    req.user = payload;
    return next();
  } catch (error) {
    console.error('[Auth] Token verification failed');
    return res.status(401).json({ success: false, message: 'Token invalido' });
  }
}

function adminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Permisos insuficientes' });
  }
  return next();
}

module.exports = { authRequired, adminRequired };
