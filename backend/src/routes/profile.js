const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const storage = require('../storage');
const { authRequired } = require('../middleware/auth');
const {
  getUsersAsync,
  saveUsersAsync,
  getProductsAsync,
  getFavoritesAsync,
  saveFavoritesAsync,
  getOrdersAsync,
  saveOrdersAsync,
} = require('../services/store');
 

const router = express.Router();

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Helper: find user by ID from token
async function findCurrentUser(req) {
  const users = await getUsersAsync();
  return users.find((u) => u.id === req.user.id || u.id === Number(req.user.sub));
}

// GET /api/v1/me/profile
router.get('/profile', authRequired, async (req, res) => {
  const user = await findCurrentUser(req);
  if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  return res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name || '',
      last_name: user.last_name || '',
      nickname: user.nickname || '',
      email: user.email || '',
      phone: user.phone || '',
      avatar_url: user.avatar_url || '',
      address: user.address || '',
      role: user.role || 'customer',
      isPremium: Boolean(user.isPremium),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// PUT /api/v1/me/profile
router.put('/profile', authRequired, async (req, res) => {
  const users = await getUsersAsync();
  const index = users.findIndex((u) => u.id === req.user.id || u.id === Number(req.user.sub));
  if (index === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  const { name, last_name, nickname, phone, address } = req.body || {};

  if (name !== undefined) {
    if (String(name).trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Nombre invalido' });
    }
    if (!users[index].name) {
      users[index].name = String(name).trim();
    }
  }

  if (last_name !== undefined && !users[index].last_name) {
    users[index].last_name = String(last_name).trim();
  }

  if (nickname !== undefined) {
    users[index].nickname = String(nickname).trim();
  }

  if (phone !== undefined) {
    users[index].phone = String(phone).trim();
  }

  if (address !== undefined && !users[index].address) {
    users[index].address = String(address).trim();
  }

  users[index].updatedAt = new Date().toISOString();

  await saveUsersAsync(users);

  return res.json({
    success: true,
    message: 'Perfil actualizado',
    user: {
      id: users[index].id,
      name: users[index].name,
      last_name: users[index].last_name || '',
      nickname: users[index].nickname || '',
      email: users[index].email,
      phone: users[index].phone || '',
      avatar_url: users[index].avatar_url || '',
      address: users[index].address || '',
      role: users[index].role,
      isPremium: Boolean(users[index].isPremium),
    },
  });
});

// PUT /api/v1/me/password
router.put('/password', authRequired, async (req, res) => {
  const users = await getUsersAsync();
  const index = users.findIndex((u) => u.id === req.user.id || u.id === Number(req.user.sub));
  if (index === -1) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

  const user = users[index];
  
  // 15 days cooldown check
  if (user.lastPasswordChange) {
    const lastChange = new Date(user.lastPasswordChange);
    const now = new Date();
    const diffTime = Math.abs(now - lastChange);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 15) {
      return res.status(400).json({ 
        success: false, 
        message: `Solo puedes cambiar la contraseña cada 15 días. Faltan ${15 - diffDays} días.` 
      });
    }
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Contraseña actual y nueva requeridas' });
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Contraseña actual incorrecta' });
  }

  // Robustness check: min 9 chars, 1 upper, 1 number, 1 special char
  const isRobust = newPassword.length >= 9 && 
                   /[A-Z]/.test(newPassword) && 
                   /\d/.test(newPassword) && 
                   /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  if (!isRobust) {
    return res.status(400).json({ 
      success: false, 
      message: 'La nueva contraseña debe tener al menos 9 caracteres, una mayúscula, un número y un carácter especial.' 
    });
  }

  users[index].passwordHash = await bcrypt.hash(newPassword, 10);
  users[index].lastPasswordChange = new Date().toISOString();
  users[index].updatedAt = new Date().toISOString();
  await saveUsersAsync(users);

  return res.json({ success: true, message: 'Contrasena actualizada' });
});

// POST /api/v1/me/avatar
router.post('/avatar', authRequired, async (req, res) => {
  const { avatar } = req.body || {};
  if (!avatar || typeof avatar !== 'string' || !avatar.startsWith('data:image/')) {
    return res.status(400).json({ success: false, message: 'No se envio imagen valida' });
  }

  const matches = avatar.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ success: false, message: 'Formato de imagen invalido' });
  }

  const headerExt = '.' + matches[1].toLowerCase();
  const base64Str = matches[2];

  // Size limits: default 2MB (configurable by env)
  const MAX_BYTES = parseInt(process.env.MAX_AVATAR_BYTES, 10) || 2 * 1024 * 1024;
  const maxBase64Len = Math.ceil(MAX_BYTES * 4 / 3) + 128;
  if (base64Str.length > maxBase64Len) {
    return res.status(413).json({ success: false, message: 'Imagen demasiado grande' });
  }

  let fileData;
  try {
    fileData = Buffer.from(base64Str, 'base64');
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Base64 invalido' });
  }

  if (fileData.length > MAX_BYTES) {
    return res.status(413).json({ success: false, message: 'Imagen demasiado grande' });
  }

  // Validate magic bytes using image-type (support CJS and ESM default)
  // Lightweight magic-bytes detection to avoid ESM/CJS package issues in tests
  function detectImageType(buf) {
    if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
    if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
      return { ext: 'png', mime: 'image/png' };
    }
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
      return { ext: 'jpg', mime: 'image/jpeg' };
    }
    if (buf.length >= 6) {
      const sig = buf.slice(0, 6).toString('ascii');
      if (sig === 'GIF87a' || sig === 'GIF89a') return { ext: 'gif', mime: 'image/gif' };
    }
    if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') {
      return { ext: 'webp', mime: 'image/webp' };
    }
    return null;
  }

  const detected = detectImageType(fileData);
  if (!detected) {
    return res.status(400).json({ success: false, message: 'El contenido no es una imagen valida' });
  }

  // Normalize extension
  let ext = '.' + (detected.ext === 'jpeg' ? 'jpg' : detected.ext);
  if (ext === '.jpeg') ext = '.jpg';

  // Debug logs (only in non-production)
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[Avatar] detected:', detected);
    console.debug('[Avatar] normalized ext:', ext);
  }

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({ success: false, message: 'Formato no permitido. Usa JPG, PNG, GIF o WebP' });
  }
  // user id (kept internal, not embedded in filename)
  const userId = req.user.id || req.user.sub;

  // Use a random filename to avoid exposing user ids and collisions
  const random = crypto.randomBytes(8).toString('hex');
  const filename = `${Date.now()}_${random}${ext}`;

  let uploadRes;
  try {
    uploadRes = await storage.upload(fileData, { filename, contentType: detected.mime });
  } catch (error) {
    console.error('[Avatar] storage upload error:', error);
    return res.status(500).json({ success: false, message: 'No se pudo guardar la imagen' });
  }

  const users = await getUsersAsync();
  const index = users.findIndex((u) => u.id === Number(userId));
  if (index !== -1) {
    try {
      const prevKey = users[index].avatar_key || null;
      if (prevKey) {
        await storage.delete(prevKey).catch(() => {});
      } else {
        const prev = users[index].avatar_url || '';
        if (prev && prev.startsWith('/uploads/avatars/')) {
          const prevName = path.basename(prev);
          await storage.delete(prevName).catch(() => {});
        }
      }
    } catch (e) {
      // non-fatal
    }

    users[index].avatar_url = uploadRes.url;
    users[index].avatar_key = uploadRes.key;
    users[index].updatedAt = new Date().toISOString();
    await saveUsersAsync(users);
  }

  return res.json({ success: true, message: 'Avatar actualizado', avatar_url: uploadRes.url });
});

// DELETE /api/v1/me/avatar
router.delete('/avatar', authRequired, async (req, res) => {
  const users = await getUsersAsync();
  const userId = req.user.id || req.user.sub;
  const index = users.findIndex((u) => u.id === Number(userId));

  if (index !== -1) {
    try {
      const prevKey = users[index].avatar_key || null;
      if (prevKey) {
        await storage.delete(prevKey).catch(() => {});
      } else if (users[index].avatar_url && users[index].avatar_url.startsWith('/uploads/avatars/')) {
        const prevName = path.basename(users[index].avatar_url);
        await storage.delete(prevName).catch(() => {});
      }
    } catch (e) {
      // non-fatal
    }

      users[index].avatar_url = '';
      users[index].avatar_key = '';
      users[index].updatedAt = new Date().toISOString();
      await saveUsersAsync(users);
  }

  return res.json({ success: true, message: 'Avatar eliminado' });
});

// GET /api/v1/me/favorites
router.get('/favorites', authRequired, async (req, res) => {
  const favorites = await getFavoritesAsync();
  const userId = req.user.id || Number(req.user.sub);
  const userFavs = favorites.filter((f) => f.userId === userId);
  const products = await getProductsAsync();
  const favProducts = userFavs
    .map((f) => products.find((p) => p.id === f.productId))
    .filter(Boolean);

  return res.json({ success: true, data: favProducts });
});

// POST /api/v1/me/favorites
router.post('/favorites', authRequired, async (req, res) => {
  const { productId } = req.body || {};
  if (!productId) return res.status(400).json({ success: false, message: 'productId requerido' });

  const products = await getProductsAsync();
  const product = products.find((p) => p.id === Number(productId));
  if (!product) return res.status(404).json({ success: false, message: 'Producto no encontrado' });

  const favorites = await getFavoritesAsync();
  const userId = req.user.id || Number(req.user.sub);
  const exists = favorites.find((f) => f.userId === userId && f.productId === Number(productId));

  if (!exists) {
    favorites.push({
      userId,
      productId: Number(productId),
      createdAt: new Date().toISOString(),
    });
    await saveFavoritesAsync(favorites);
  }

  return res.json({ success: true, message: 'Agregado a favoritos' });
});

// DELETE /api/v1/me/favorites/:productId
router.delete('/favorites/:productId', authRequired, async (req, res) => {
  const productId = Number(req.params.productId);
  const userId = req.user.id || Number(req.user.sub);
  let favorites = await getFavoritesAsync();
  favorites = favorites.filter((f) => !(f.userId === userId && f.productId === productId));
  await saveFavoritesAsync(favorites);

  return res.json({ success: true, message: 'Eliminado de favoritos' });
});

// GET /api/v1/me/orders
router.get('/orders', authRequired, async (req, res) => {
  const orders = await getOrdersAsync();
  const userId = req.user.id || Number(req.user.sub);
  const userOrders = orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ success: true, data: userOrders });
});

// POST /api/v1/me/orders
router.post('/orders', authRequired, async (req, res) => {
  const { items, total } = req.body || {};
  if (!items || !Array.isArray(items) || items.length === 0 || !total || total <= 0) {
    return res.status(400).json({ success: false, message: 'Pedido invalido' });
  }

  const orders = await getOrdersAsync();
  const userId = req.user.id || Number(req.user.sub);
  const newId = orders.length > 0 ? Math.max(...orders.map((o) => o.id || 0)) + 1 : 1;

  const order = {
    id: newId,
    userId,
    items,
    total: Number(total),
    status: 'completado',
    createdAt: new Date().toISOString(),
  };

  orders.push(order);
  await saveOrdersAsync(orders);

  return res.status(201).json({ success: true, message: 'Pedido registrado', orderId: newId });
});

// GET /api/v1/me/recommendations
router.get('/recommendations', authRequired, async (req, res) => {
  const favorites = await getFavoritesAsync();
  const userId = req.user.id || Number(req.user.sub);
  const userFavs = favorites.filter((f) => f.userId === userId);
  const products = await getProductsAsync();

  // Get favorite categories
  const favProductIds = new Set(userFavs.map((f) => f.productId));
  const favCategories = new Set();
  for (const fav of userFavs) {
    const product = products.find((p) => p.id === fav.productId);
    if (product) favCategories.add(product.category);
  }

  // Recommend: same categories first, then others, exclude already favorited
  const recommended = [];
  const others = [];
  for (const product of products) {
    if (favProductIds.has(product.id)) continue;
    if (favCategories.has(product.category)) {
      recommended.push(product);
    } else {
      others.push(product);
    }
  }

  return res.json({ success: true, data: [...recommended, ...others].slice(0, 8) });
});

module.exports = router;
