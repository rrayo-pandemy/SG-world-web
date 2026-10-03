const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:8000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isTrustedTunnelOrigin(origin) {
  return /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/i.test(origin);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (process.env.NODE_ENV !== 'production') {
    if (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('::1') ||
      origin.includes('192.168.') ||
      origin.includes('10.') ||
      origin.includes('172.') ||
      isTrustedTunnelOrigin(origin)
    ) {
      return true;
    }
  }

  return allowedOrigins.includes(origin);
}

const { bootstrapData, getUsers } = require('./services/store');
const { notFound, errorHandler } = require('./middleware/errors');
const originCheck = require('./middleware/originCheck');
const validateContentType = require('./middleware/validateContentType');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const profileRoutes = require('./routes/profile');
const categoryRoutes = require('./routes/categories');
const { paymentRoutes } = require('./routes/payments');
const { authRequired } = require('./middleware/auth');

const path = require('path');

bootstrapData();

const app = express();

// Apply origin/referer check for state-changing requests (S-03: active in ALL environments)
app.use(originCheck(allowedOrigins));

app.use(compression());

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", ...allowedOrigins],
      },
    },
  })
);

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(validateContentType);
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      if (process.env.NODE_ENV !== 'production') {
        const ip = req.ip || req.connection.remoteAddress || '';
        return ip.includes('127.0.0.1') || ip.includes('::1') || ip.includes('192.168.') || ip.includes('10.') || ip.includes('172.');
      }
      return false;
    },
  })
);

app.use('/api/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/me', profileRoutes);
app.use('/api/v1/categories', categoryRoutes);

// Payment simulation routes (dev/test only)
paymentRoutes(app);

// Serve uploaded files (avatars)
app.use('/uploads', express.static(path.join(__dirname, '..', '..', 'frontend', 'uploads')));

// Legacy login limiter (rate limited for brute-force protection)
const legacyLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    status: 'error', message: 'Demasiados intentos fallidos, intente nuevamente en 15 minutos'
  },
});

// Legacy login route for existing frontend modal
const bcrypt = require('bcryptjs');
const { isAccountLocked: isLocked, recordFailedAttempt: recordFail, clearFailedAttempts: clearFails } = require('./middleware/accountLockout');
app.post('/api/login', legacyLoginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Faltan credenciales' });
  }

  const normalizedEmail = String(email).toLowerCase();

  // S-10: Account lockout check
  const lockStatus = isLocked(normalizedEmail);
  if (lockStatus.locked) {
    const remainingMin = Math.ceil(lockStatus.remainingMs / 60000);
    return res.status(423).json({ status: 'error', message: `Cuenta bloqueada. Intenta en ${remainingMin} min.` });
  }

  const users = getUsers();
  const user = users.find((u) => u.email === normalizedEmail);
  if (!user) {
    recordFail(normalizedEmail);
    return res.status(401).json({ status: 'error', message: 'Credenciales invalidas' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    recordFail(normalizedEmail);
    return res.status(401).json({ status: 'error', message: 'Credenciales invalidas' });
  }

  clearFails(normalizedEmail);

  return res.json({
    status: 'ok',
    type: user.role === 'admin' ? 'premium' : 'normal',
    user: { id: user.id, email: user.email, role: user.role },
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
