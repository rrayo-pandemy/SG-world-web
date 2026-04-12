const express = require('express');
const { body, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { getCarts, saveCarts, getProducts } = require('../services/store');

const router = express.Router();

function getUserCart(userId) {
  const carts = getCarts();
  return carts.find((c) => c.userId === userId) || null;
}

router.get('/', authRequired, (req, res) => {
  const cart = getUserCart(req.user.id) || { userId: req.user.id, items: [] };
  return res.json({ success: true, data: cart });
});

router.post(
  '/items',
  authRequired,
  [body('productId').isInt({ min: 1 }), body('quantity').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const productId = Number(req.body.productId);
    const quantity = Number(req.body.quantity);
    const products = getProducts();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }

    const carts = getCarts();
    let cart = carts.find((c) => c.userId === req.user.id);

    if (!cart) {
      cart = { userId: req.user.id, items: [], updatedAt: new Date().toISOString() };
      carts.push(cart);
    }

    const existing = cart.items.find((i) => i.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }

    cart.updatedAt = new Date().toISOString();
    saveCarts(carts);

    return res.status(201).json({ success: true, data: cart });
  }
);

router.put('/items/:productId', authRequired, [body('quantity').isInt({ min: 1 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const productId = Number(req.params.productId);
  const quantity = Number(req.body.quantity);
  const carts = getCarts();
  const cart = carts.find((c) => c.userId === req.user.id);

  if (!cart) {
    return res.status(404).json({ success: false, message: 'Carrito no encontrado' });
  }

  const item = cart.items.find((i) => i.productId === productId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item no encontrado en carrito' });
  }

  item.quantity = quantity;
  cart.updatedAt = new Date().toISOString();
  saveCarts(carts);

  return res.json({ success: true, data: cart });
});

router.delete('/items/:productId', authRequired, (req, res) => {
  const productId = Number(req.params.productId);
  const carts = getCarts();
  const cart = carts.find((c) => c.userId === req.user.id);

  if (!cart) {
    return res.status(404).json({ success: false, message: 'Carrito no encontrado' });
  }

  cart.items = cart.items.filter((i) => i.productId !== productId);
  cart.updatedAt = new Date().toISOString();
  saveCarts(carts);

  return res.json({ success: true, data: cart });
});

router.delete('/', authRequired, (req, res) => {
  const carts = getCarts();
  const cart = carts.find((c) => c.userId === req.user.id);

  if (cart) {
    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    saveCarts(carts);
  }

  return res.json({ success: true, message: 'Carrito vaciado' });
});

module.exports = router;
