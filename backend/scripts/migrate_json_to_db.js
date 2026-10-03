/*
Script to migrate JSON data from backend/src/data (or frontend/src/data) to PostgreSQL via Prisma.
Run: DATABASE_URL="postgresql://user:pass@localhost:5432/dbname" node scripts/migrate_json_to_db.js

This script is idempotent for most inserts by using upsert where appropriate.
*/

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function loadJson(file) {
  const p = path.join(__dirname, '..', 'src', 'data', file);
  try {
    const txt = await fs.readFile(p, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    console.error('Failed to load', file, e.message);
    return [];
  }
}

async function migrateCategories() {
  const cats = await loadJson('categories.json');
  for (const c of cats) {
    await prisma.category.upsert({
      where: { id: String(c.id) },
      update: { name: c.name },
      create: { id: String(c.id), name: c.name }
    });
  }
}

async function migrateProducts() {
  const products = await loadJson('products.json');
  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {
        name: p.name,
        description: p.description || null,
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        image: p.image || null,
        updatedAt: new Date()
      },
      create: {
        id: p.id,
        name: p.name,
        description: p.description || null,
        price: Number(p.price || 0),
        stock: Number(p.stock || 0),
        image: p.image || null,
        categoryId: p.category || null,
        createdAt: new Date()
      }
    });
  }
}

async function migrateUsers() {
  const users = await loadJson('users.json');
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name || null,
        email: u.email,
        passwordHash: u.password || '',
        role: u.role || 'user',
        avatarUrl: u.avatar || null,
        updatedAt: new Date()
      },
      create: {
        name: u.name || null,
        email: u.email,
        passwordHash: u.password || '',
        role: u.role || 'user',
        avatarUrl: u.avatar || null
      }
    });
  }
}

async function migrateFavorites() {
  const favs = await loadJson('favorites.json');
  for (const f of favs) {
    try {
      const user = await prisma.user.findUnique({ where: { email: f.user || undefined, id: f.userId || undefined } });
      // try by id or email
      let userId = null;
      if (user) userId = user.id;
      if (!user && f.userId) userId = f.userId;
      if (!userId) continue;
      await prisma.favorite.upsert({
        where: { userId_productId: { userId: userId, productId: f.productId } },
        update: {},
        create: {
          userId: userId,
          productId: f.productId
        }
      });
    } catch (err) {
      console.warn('Failed migrating favorite', f, err.message);
    }
  }
}

async function main() {
  try {
    console.log('Migrating categories...');
    await migrateCategories();
    console.log('Migrating products...');
    await migrateProducts();
    console.log('Migrating users...');
    await migrateUsers();
    console.log('Migrating favorites...');
    await migrateFavorites();
    console.log('Migration complete.');
  } catch (e) {
    console.error('Migration failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
