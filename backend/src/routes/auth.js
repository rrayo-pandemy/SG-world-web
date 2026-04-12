const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getUsers, saveUsers } = require('../services/store');

const router = express.Router();

const registerValidation = [
  body('name').trim().isLength({ min: 2 }).withMessage('Nombre invalido'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
  body('password').isLength({ min: 8 }).withMessage('Password debe tener al menos 8 caracteres'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
  body('password').isLength({ min: 1 }).withMessage('Password requerido'),
];

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'dev_secret_change_me',
    { expiresIn: '8h' }
  );
}

router.post('/register', registerValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { name, email, password } = req.body;
  const users = getUsers();

  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ success: false, message: 'El usuario ya existe' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;

  const user = {
    id: nextId,
    name,
    email,
    passwordHash,
    role: 'customer',
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  saveUsers(users);

  const token = signToken(user);
  return res.status(201).json({
    success: true,
    message: 'Usuario registrado',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: Boolean(user.isPremium),
    },
  });
});

router.post('/login', loginValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password } = req.body;
  const users = getUsers();

  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Credenciales invalidas' });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ success: false, message: 'Credenciales invalidas' });
  }

  const token = signToken(user);
  return res.json({
    success: true,
    message: 'Login exitoso',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isPremium: Boolean(user.isPremium),
    },
  });
});

module.exports = router;
