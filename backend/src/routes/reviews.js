const express = require('express');
const { body, validationResult } = require('express-validator');
const { getReviews, saveReviews, getUsers, getReviewsAsync, saveReviewsAsync, getUsersAsync } = require('../services/store');
const { authRequired, adminRequired } = require('../middleware/auth');

const router = express.Router();

// GET: Obtener reseñas de un producto especifico
router.get('/:productId', async (req, res) => {
  const productId = Number(req.params.productId);
  const reviews = (await getReviewsAsync()).filter((r) => r.productId === productId);
  
  return res.json({ success: true, data: reviews });
});

// POST: Crear una nueva reseña (Requiere estar logueado)
router.post(
  '/',
  authRequired,
  [
    body('productId').isNumeric(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').trim().isLength({ min: 2, max: 500 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const reviews = await getReviewsAsync();
    const users = await getUsersAsync();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const newReview = {
      id: Date.now(),
      productId: Number(req.body.productId),
      userId: user.id,
      userName: user.name,
      userRole: user.role, // Guardamos el rol para saber si es moderador
      rating: Number(req.body.rating),
      comment: req.body.comment,
      date: new Date().toISOString(),
    };

    reviews.push(newReview);
    await saveReviewsAsync(reviews);

    return res.status(201).json({ success: true, data: newReview });
  }
);

// DELETE: Eliminar una reseña (Solo Administradores)
router.delete('/:id', authRequired, adminRequired, async (req, res) => {
  const id = Number(req.params.id);
  const reviews = await getReviewsAsync();
  const index = reviews.findIndex((r) => r.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Reseña no encontrada' });
  }

  const deletedReview = reviews.splice(index, 1);
  await saveReviewsAsync(reviews);

  return res.json({ 
    success: true, 
    message: 'Reseña eliminada correctamente',
    data: deletedReview[0] 
  });
});

module.exports = router;
