const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getUsers, saveUsers, getUsersAsync, saveUsersAsync } = require('../services/store');
const { isAccountLocked, recordFailedAttempt, clearFailedAttempts, getRemainingAttempts } = require('../middleware/accountLockout');

const router = express.Router();

const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Nombre invalido'),
  body('last_name').trim().notEmpty().withMessage('Apellido es obligatorio'),
  body('phone').trim().notEmpty().withMessage('Telefono es obligatorio'),
  body('address').trim().notEmpty().withMessage('Direccion es obligatoria'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
  body('password').isLength({ min: 8 }).withMessage('Password debe tener al menos 8 caracteres'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
  body('password').isLength({ min: 1 }).withMessage('Password requerido'),
];

function shouldUseCrossSiteCookie(req) {
  const origin = String(req.headers.origin || '');
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '');

  if (forwardedProto.includes('https')) return true;
  if (/^https:\/\//i.test(origin) && !/localhost|127\.0\.0\.1|::1/i.test(origin)) return true;

  return false;
}

function getAuthCookieOptions(req) {
  const crossSite = shouldUseCrossSiteCookie(req);

  return {
    httpOnly: true,
    secure: crossSite || process.env.NODE_ENV === 'production',
    sameSite: crossSite ? 'none' : 'lax',
    maxAge: 8 * 60 * 60 * 1000,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '8h',
  });
}

router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, last_name, phone, address, email, password } = req.body;
  const users = await getUsersAsync();

  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ success: false, message: 'El usuario ya existe' });
  }

  // Robustness check: min 9 chars, 1 upper, 1 number, 1 special char
  const isRobust = password.length >= 9 && 
                   /[A-Z]/.test(password) && 
                   /\d/.test(password) && 
                   /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!isRobust) {
    return res.status(400).json({ 
      success: false, 
      message: 'La contraseña debe tener al menos 9 caracteres, una mayúscula, un número y un carácter especial.' 
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;

  const user = {
    id: nextId,
    name,
    last_name,
    phone,
    address,
    email,
    passwordHash,
    role: 'user',
    lastPasswordChange: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  await saveUsersAsync(users);

  const token = signToken(user);
  // Set auth token as HttpOnly cookie
  res.cookie('auth_token', token, getAuthCookieOptions(req));

  const payload = {
    success: true,
    message: 'Usuario registrado',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: Boolean(user.isPremium),
    },
  };

  if (process.env.NODE_ENV !== 'production') payload.token = token;

  return res.status(201).json(payload);
});

router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;

  // S-10: Check if account is locked
  const lockStatus = isAccountLocked(email);
  if (lockStatus.locked) {
    const remainingMin = Math.ceil(lockStatus.remainingMs / 60000);
    return res.status(423).json({
      success: false,
      message: `Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en ${remainingMin} minutos.`,
    });
  }

  const users = await getUsersAsync();

  const user = users.find((u) => u.email === email);
  if (!user) {
    recordFailedAttempt(email);
    const remaining = getRemainingAttempts(email);
    return res.status(401).json({
      success: false,
      message: remaining > 0
        ? `Credenciales invalidas. ${remaining} intentos restantes.`
        : 'Cuenta bloqueada por demasiados intentos fallidos.',
    });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const result = recordFailedAttempt(email);
    if (result.locked) {
      return res.status(423).json({
        success: false,
        message: 'Cuenta bloqueada por demasiados intentos fallidos. Intenta de nuevo en 30 minutos.',
      });
    }
    const remaining = getRemainingAttempts(email);
    return res.status(401).json({
      success: false,
      message: `Credenciales invalidas. ${remaining} intentos restantes.`,
    });
  }

  // Success — clear failed attempts
  clearFailedAttempts(email);

  const token = signToken(user);
  // Set auth token cookie (HttpOnly)
  res.cookie('auth_token', token, getAuthCookieOptions(req));

  const resp = {
    success: true,
    message: 'Login exitoso',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: Boolean(user.isPremium),
      mustChangePassword: Boolean(user.mustChangePassword),
    },
  };

  if (process.env.NODE_ENV !== 'production') resp.token = token;

  return res.json(resp);
});

router.post('/logout', (req, res) => {
  const { httpOnly, secure, sameSite } = getAuthCookieOptions(req);
  res.clearCookie('auth_token', { httpOnly, secure, sameSite });
  return res.json({ success: true, message: 'Logout exitoso' });
});

module.exports = router;
