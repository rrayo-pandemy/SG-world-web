const express = require('express');
const { body, validationResult } = require('express-validator');
const { getProducts, saveProducts } = require('../services/store');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

function normalizeBadge(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'nuevo') return 'Nuevo';
  if (normalized === 'edicion') return 'Edicion';
  return null;
}

router.get('/', (req, res) => {
  const { category, q } = req.query;
  let products = getProducts();

  if (category) {
    products = products.filter((p) => p.category === category);
  }

  if (q) {
    const term = q.toLowerCase();
    products = products.filter((p) => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term));
  }

  return res.json({ success: true, count: products.length, data: products });
});

router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = getProducts().find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  return res.json({ success: true, data: product });
});

router.post(
  '/',
  authRequired,
  adminRequired,
  [
    body('name').trim().isLength({ min: 2 }),
    body('description').trim().isLength({ min: 10 }),
    body('category').trim().isLength({ min: 3 }),
    body('price').isFloat({ gt: 0 }),
    body('stock').isInt({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const products = getProducts();
    const nextId = products.length ? Math.max(...products.map((p) => p.id)) + 1 : 1;

    const newProduct = {
      id: nextId,
      sku: req.body.sku || `AURA-${String(nextId).padStart(4, '0')}`,
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      price: Number(req.body.price),
      stock: Number(req.body.stock),
      isPremium: Boolean(req.body.isPremium),
      badge: normalizeBadge(req.body.badge),
      image: req.body.image || 'https://via.placeholder.com/500x400?text=Product',
      createdAt: new Date().toISOString(),
    };

    products.push(newProduct);
    saveProducts(products);

    return res.status(201).json({ success: true, data: newProduct });
  }
);

router.put('/:id', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const products = getProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  const payload = { ...req.body };
  if (Object.prototype.hasOwnProperty.call(payload, 'isPremium')) {
    payload.isPremium = Boolean(payload.isPremium);
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'badge')) {
    payload.badge = normalizeBadge(payload.badge);
  }

  products[index] = {
    ...products[index],
    ...payload,
    id,
    updatedAt: new Date().toISOString(),
  };

  saveProducts(products);
  return res.json({ success: true, data: products[index] });
});

router.delete('/:id', authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  const products = getProducts();
  const next = products.filter((p) => p.id !== id);

  if (next.length === products.length) {
    return res.status(404).json({ success: false, message: 'Producto no encontrado' });
  }

  saveProducts(next);
  return res.json({ success: true, message: 'Producto eliminado' });
});

module.exports = router;
