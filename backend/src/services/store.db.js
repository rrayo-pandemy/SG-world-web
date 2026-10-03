const { getPrisma } = require('../db/prismaClient');

// Adapter layer: implements a subset of the `store` API using Prisma
// Only implements the read/write methods needed by existing routes: users, products, favorites, orders, reviews, categories, carts

function mapUserToPublic(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    last_name: u.last_name,
    nickname: u.nickname,
    phone: u.phone,
    address: u.address,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    isPremium: u.isPremium,
    avatar_url: u.avatarUrl,
    avatar_key: u.avatarKey,
    createdAt: u.createdAt ? u.createdAt.toISOString() : null,
    updatedAt: u.updatedAt ? u.updatedAt.toISOString() : null,
    lastPasswordChange: u.lastPasswordChange ? u.lastPasswordChange.toISOString() : null,
  };
}

module.exports = {
  // Users
  async getUsersAsync() {
    const prisma = getPrisma();
    const users = await prisma.user.findMany();
    return users.map(mapUserToPublic);
  },

  async saveUsersAsync(payload) {
    const prisma = getPrisma();
    // naive: replace all users (for simplicity in migration). Better: patch per-item
    // We'll upsert each user by email
    for (const u of payload) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name || null,
          last_name: u.last_name || null,
          nickname: u.nickname || null,
          phone: u.phone || null,
          address: u.address || null,
          passwordHash: u.passwordHash || u.password || '',
          role: u.role || 'user',
          isPremium: Boolean(u.isPremium),
          avatarUrl: u.avatar_url || u.avatarUrl || null,
          avatarKey: u.avatar_key || u.avatarKey || null,
          updatedAt: new Date(),
        },
        create: {
          id: u.id,
          name: u.name || null,
          last_name: u.last_name || null,
          nickname: u.nickname || null,
          phone: u.phone || null,
          address: u.address || null,
          email: u.email,
          passwordHash: u.passwordHash || u.password || '',
          role: u.role || 'user',
          isPremium: Boolean(u.isPremium),
          avatarUrl: u.avatar_url || u.avatarUrl || null,
          avatarKey: u.avatar_key || u.avatarKey || null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        }
      });
    }
  },

  // Products
  async getProductsAsync() {
    const prisma = getPrisma();
    const prods = await prisma.product.findMany();
    return prods.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      category: p.categoryId,
      price: p.price,
      stock: p.stock,
      isPremium: p.isPremium,
      badge: p.badge,
      image: p.image,
      createdAt: p.createdAt ? p.createdAt.toISOString() : null,
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
    }));
  },

  async saveProductsAsync(payload) {
    const prisma = getPrisma();
    for (const p of payload) {
      await prisma.product.upsert({
        where: { id: p.id },
        update: {
          name: p.name,
          description: p.description || null,
          categoryId: p.category || null,
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          isPremium: Boolean(p.isPremium),
          badge: p.badge || null,
          image: p.image || null,
          updatedAt: new Date(),
        },
        create: {
          id: p.id,
          sku: p.sku || null,
          name: p.name,
          description: p.description || null,
          categoryId: p.category || null,
          price: Number(p.price || 0),
          stock: Number(p.stock || 0),
          isPremium: Boolean(p.isPremium),
          badge: p.badge || null,
          image: p.image || null,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
        }
      });
    }
  },

  // Favorites
  async getFavoritesAsync() {
    const prisma = getPrisma();
    const favs = await prisma.favorite.findMany();
    return favs.map(f => ({ id: f.id, userId: f.userId, productId: f.productId, createdAt: f.createdAt ? f.createdAt.toISOString() : null }));
  },

  async saveFavoritesAsync(payload) {
    const prisma = getPrisma();
    // naive replace: delete all and recreate
    await prisma.favorite.deleteMany();
    for (const f of payload) {
      await prisma.favorite.create({ data: { userId: f.userId, productId: f.productId, createdAt: f.createdAt ? new Date(f.createdAt) : new Date() } });
    }
  },

  // Orders
  async getOrdersAsync() {
    const prisma = getPrisma();
    const orders = await prisma.order.findMany({ include: { items: true } });
    return orders.map(o => ({ id: o.id, userId: o.userId, items: o.items, total: o.totals || o.total, status: o.status, createdAt: o.createdAt ? o.createdAt.toISOString() : null }));
  },

  async saveOrdersAsync(payload) {
    const prisma = getPrisma();
    for (const o of payload) {
      await prisma.order.upsert({
        where: { id: o.id },
        update: {
          userId: o.userId || null,
          status: o.status || null,
          totals: o.totals || null,
          traceability: o.traceability || null,
          updatedAt: new Date(),
        },
        create: {
          id: o.id,
          orderNumber: o.orderNumber || null,
          userId: o.userId || null,
          paymentMethod: o.paymentMethod || null,
          status: o.status || null,
          totals: o.totals || null,
          traceability: o.traceability || null,
          createdAt: o.createdAt ? new Date(o.createdAt) : new Date(),
        }
      });
    }
  },

  // Reviews
  async getReviewsAsync() {
    const prisma = getPrisma();
    const revs = await prisma.review.findMany();
    return revs.map(r => ({ id: r.id, productId: r.productId, userId: r.userId, userName: r.userName, userRole: r.userRole, rating: r.rating, comment: r.comment, date: r.date ? r.date.toISOString() : null }));
  },

  async saveReviewsAsync(payload) {
    const prisma = getPrisma();
    for (const r of payload) {
      await prisma.review.upsert({ where: { id: r.id }, update: { rating: r.rating, comment: r.comment, userName: r.userName, userRole: r.userRole, date: r.date ? new Date(r.date) : new Date() }, create: { id: r.id, productId: r.productId, userId: r.userId, userName: r.userName || null, userRole: r.userRole || null, rating: r.rating, comment: r.comment, date: r.date ? new Date(r.date) : new Date() } });
    }
  },

  // Categories
  async getCategoriesAsync() {
    const prisma = getPrisma();
    const cats = await prisma.category.findMany();
    return cats.map(c => ({ id: c.id, name: c.name }));
  },

  async saveCategoriesAsync(payload) {
    const prisma = getPrisma();
    for (const c of payload) {
      await prisma.category.upsert({ where: { id: String(c.id) }, update: { name: c.name }, create: { id: String(c.id), name: c.name } });
    }
  },

  // Carts (simple mapping)
  async getCartsAsync() {
    const prisma = getPrisma();
    const carts = await prisma.cart.findMany({ include: { items: true } });
    return carts.map(c => ({ id: c.id, userId: c.userId, items: c.items }));
  },

  async saveCartsAsync(payload) {
    const prisma = getPrisma();
    for (const c of payload) {
      await prisma.cart.upsert({ where: { id: c.id }, update: { userId: c.userId }, create: { id: c.id, userId: c.userId } });
      // naive: delete items then recreate
      await prisma.cartItem.deleteMany({ where: { cartId: c.id } });
      for (const it of c.items || []) {
        await prisma.cartItem.create({ data: { cartId: c.id, productId: it.productId, quantity: it.quantity } });
      }
    }
  },
};
