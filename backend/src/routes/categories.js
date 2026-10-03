const express = require('express');
const { getCategories, saveCategories, getCategoriesAsync, saveCategoriesAsync } = require('../services/store');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/categories - Public
router.get('/', async (req, res) => {
  console.log('GET /api/v1/categories hit');
  const categories = await getCategoriesAsync();
  res.json({ success: true, data: categories });
});

// POST /api/v1/categories - Admin only
router.post('/', authRequired, adminRequired, async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, message: 'ID y Nombre requeridos' });
  }

  const categories = await getCategoriesAsync();
  if (categories.some(c => c.id === id)) {
    return res.status(400).json({ success: false, message: 'La categoría ya existe' });
  }

  const newCategory = { id, name };
  categories.push(newCategory);
  await saveCategoriesAsync(categories);
  res.status(201).json({ success: true, data: newCategory });
});

// PUT /api/v1/categories/:id - Admin only
router.put('/:id', authRequired, adminRequired, async (req, res) => {
  const categories = await getCategoriesAsync();
  const index = categories.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
  }

  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ success: false, message: 'Nombre requerido' });
  }

  categories[index].name = name;
  await saveCategoriesAsync(categories);
  res.json({ success: true, data: categories[index] });
});

// DELETE /api/v1/categories/:id - Admin only
router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const categories = await getCategoriesAsync();
  const next = categories.filter(c => c.id !== req.params.id);
  if (next.length === categories.length) {
    return res.status(404).json({ success: false, message: 'Categoría no encontrada' });
  }

  await saveCategoriesAsync(next);
  res.json({ success: true, message: 'Categoría eliminada' });
});

module.exports = router;
