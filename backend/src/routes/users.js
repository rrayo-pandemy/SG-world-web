const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getUsers, saveUsers } = require('../services/store');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

const allowedRoles = new Set(['admin', 'user', 'customer']);

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  if (allowedRoles.has(normalized)) return normalized;
  return 'customer';
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || 'customer',
    isPremium: Boolean(user.isPremium),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

router.get('/', authRequired, adminRequired, (req, res) => {
  const users = getUsers();
  return res.json({ success: true, count: users.length, data: users.map(toPublicUser) });
});

router.post(
  '/',
  authRequired,
  adminRequired,
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Nombre invalido'),
    body('email').isEmail().normalizeEmail().withMessage('Email invalido'),
    body('password').isLength({ min: 8 }).withMessage('Password debe tener al menos 8 caracteres'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const users = getUsers();
    const email = String(req.body.email || '').toLowerCase();

    if (users.some((u) => u.email === email)) {
      return res.status(409).json({ success: false, message: 'El usuario ya existe' });
    }

    const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
    const passwordHash = await bcrypt.hash(req.body.password, 10);

    const user = {
      id: nextId,
      name: String(req.body.name || '').trim(),
      email,
      passwordHash,
      role: normalizeRole(req.body.role),
      isPremium: Boolean(req.body.isPremium),
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);
    return res.status(201).json({ success: true, data: toPublicUser(user) });
  }
);

router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  const current = users[index];
  const nextEmail = req.body.email ? String(req.body.email).toLowerCase() : current.email;

  if (nextEmail !== current.email && users.some((u) => u.email === nextEmail && u.id !== id)) {
    return res.status(409).json({ success: false, message: 'El email ya esta en uso' });
  }

  const nextUser = {
    ...current,
    name: req.body.name ? String(req.body.name).trim() : current.name,
    email: nextEmail,
    role: req.body.role ? normalizeRole(req.body.role) : current.role,
    isPremium: Object.prototype.hasOwnProperty.call(req.body, 'isPremium')
      ? Boolean(req.body.isPremium)
      : Boolean(current.isPremium),
    updatedAt: new Date().toISOString(),
  };

  if (req.body.password && String(req.body.password).trim()) {
    nextUser.passwordHash = await bcrypt.hash(String(req.body.password), 10);
  }

  users[index] = nextUser;
  saveUsers(users);
  return res.json({ success: true, data: toPublicUser(nextUser) });
});

router.patch('/:id/premium', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  users[index] = {
    ...users[index],
    isPremium: Boolean(req.body.isPremium),
    updatedAt: new Date().toISOString(),
  };

  saveUsers(users);
  return res.json({ success: true, data: toPublicUser(users[index]) });
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const users = getUsers();
  const next = users.filter((u) => u.id !== id);

  if (next.length === users.length) {
    return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
  }

  saveUsers(next);
  return res.json({ success: true, message: 'Usuario eliminado' });
});

module.exports = router;
