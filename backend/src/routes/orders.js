const express = require('express');
const { body, validationResult } = require('express-validator');
const { authRequired } = require('../middleware/auth');
const { getCarts, saveCarts, getOrders, saveOrders, getProducts, getCartsAsync, saveCartsAsync, getOrdersAsync, saveOrdersAsync, getProductsAsync } = require('../services/store');

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  const orders = (await getOrdersAsync()).filter((o) => o.userId === req.user.id);
  return res.json({ success: true, count: orders.length, data: orders });
});

router.post(
  '/',
  authRequired,
  [
    body('fullName').trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('address').trim().isLength({ min: 8 }),
    body('phone').trim().isLength({ min: 6 }),
    body('paymentMethod').trim().isLength({ min: 3 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const carts = await getCartsAsync();
    const cart = carts.find((c) => c.userId === req.user.id);
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: 'Carrito vacio' });
    }

    const products = await getProductsAsync();
    const items = cart.items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return {
        productId: item.productId,
        name: product ? product.name : 'Producto',
        unitPrice: product ? product.price : 0,
        quantity: item.quantity,
        lineTotal: Number(((product ? product.price : 0) * item.quantity).toFixed(2)),
      };
    });

    const subtotal = Number(items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
    const shipping = subtotal >= 200 ? 0 : 10;
    const total = Number((subtotal + shipping).toFixed(2));

    const orders = await getOrdersAsync();
    const nextId = orders.length ? Math.max(...orders.map((o) => o.id)) + 1 : 1;

    const order = {
      id: nextId,
      orderNumber: `AM-${String(Date.now()).slice(-8)}`,
      userId: req.user.id,
      customer: {
        fullName: req.body.fullName,
        email: req.body.email,
        address: req.body.address,
        phone: req.body.phone,
      },
      paymentMethod: req.body.paymentMethod,
      status: 'confirmed',
      items,
      totals: { subtotal, shipping, total },
      traceability: [
        { status: 'created', at: new Date().toISOString(), by: 'system' },
        { status: 'confirmed', at: new Date().toISOString(), by: 'system' },
      ],
      createdAt: new Date().toISOString(),
    };


    orders.push(order);
    await saveOrdersAsync(orders);

    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    await saveCartsAsync(carts);

    return res.status(201).json({ success: true, data: order });
  }
);

module.exports = router;
