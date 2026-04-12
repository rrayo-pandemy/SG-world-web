const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { bootstrapData, getUsers } = require('./services/store');
const { notFound, errorHandler } = require('./middleware/errors');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const { authRequired } = require('./middleware/auth');

bootstrapData();

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:8000'],
      },
    },
  })
);

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:8000';
app.use(cors({ origin: [allowedOrigin, 'http://127.0.0.1:8000'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/orders', orderRoutes);

app.get('/api/v1/me', authRequired, (req, res) => {
  const users = getUsers();
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'customer',
      isPremium: Boolean(user.isPremium),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// Legacy login route for existing frontend modal
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'Faltan credenciales' });
  }

  const users = getUsers();
  const user = users.find((u) => u.email === String(email).toLowerCase());
  if (!user) {
    return res.status(401).json({ status: 'error', message: 'Credenciales invalidas' });
  }

  const bcrypt = require('bcryptjs');
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ status: 'error', message: 'Credenciales invalidas' });
  }

  return res.json({
    status: 'ok',
    type: user.role === 'admin' ? 'premium' : 'normal',
    user: { id: user.id, email: user.email, role: user.role },
  });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
