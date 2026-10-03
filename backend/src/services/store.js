const path = require('path');
const bcrypt = require('bcryptjs');
const { ensureDir, ensureFile, ensureFileAsync, readJson, readJsonAsync, writeJson, writeJsonAsync } = require('../utils/fileDb');

// If USE_DB=true use Prisma adapter
let dbAdapter = null;
if (process.env.USE_DB === 'true' || process.env.USE_DB === '1') {
  try {
    dbAdapter = require('./store.db');
  } catch (e) {
    console.warn('USE_DB enabled but store.db adapter failed to load:', e.message);
    dbAdapter = null;
  }
}

const dataDir = path.join(__dirname, '..', 'data');
const usersFile = path.join(dataDir, 'users.json');
const productsFile = path.join(dataDir, 'products.json');
const cartsFile = path.join(dataDir, 'carts.json');
const ordersFile = path.join(dataDir, 'orders.json');
const reviewsFile = path.join(dataDir, 'reviews.json');
const favoritesFile = path.join(dataDir, 'favorites.json');
const categoriesFile = path.join(dataDir, 'categories.json');

function bootstrapData() {
  ensureDir(dataDir);
  // Only seed demo users in non-production environments or when explicitly allowed
  const allowDemo = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_USERS === 'true';
  if (allowDemo) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️  WARNING: Demo users are being created in PRODUCTION because ALLOW_DEMO_USERS=true.');
      console.warn('⚠️  This is a security risk. Remove ALLOW_DEMO_USERS or set NODE_ENV=production to disable.');
    }
    const adminPassword = bcrypt.hashSync('Admin1234', 10);
    const customerPassword = bcrypt.hashSync('Cliente1234', 10);
    const demoUsers = [
      {
        id: 1,
        name: 'Admin Ganesh',
        email: 'admin@elrinconazul.com',
        passwordHash: adminPassword,
        role: 'admin',
        isDemoAccount: true,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        name: 'Cliente Demo',
        email: 'cliente@elrinconazul.com',
        passwordHash: customerPassword,
        role: 'user',
        isDemoAccount: true,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      },
    ];

    if (process.env.NODE_ENV === 'test') {
      // For tests we overwrite to ensure deterministic data
      writeJson(usersFile, demoUsers);
    } else {
      ensureFile(usersFile, demoUsers);
    }
  } else {
    ensureFile(usersFile, []);
  }

  ensureFile(productsFile, [
    {
      id: 1,
      sku: 'AURA-ESSENCE-01',
      name: 'Auroral Essence',
      description: 'Serum luminoso con extractos botanicos del norte.',
      category: 'skincare',
      price: 49.99,
      stock: 45,
      isPremium: false,
      badge: 'Nuevo',
      image: 'https://via.placeholder.com/500x400/0f6f7f/f3efe5?text=Auroral+Essence',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      sku: 'AURA-RELAX-02',
      name: 'Linen Calm Diffuser',
      description: 'Difusor con notas limpias y acabado premium.',
      category: 'home',
      price: 79.0,
      stock: 20,
      isPremium: false,
      badge: null,
      image: 'https://via.placeholder.com/500x400/0b3c5d/f7f1e3?text=Linen+Calm',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      sku: 'AURA-DIGI-03',
      name: 'Teal Smart Bottle',
      description: 'Botella termica conectada con recordatorio inteligente.',
      category: 'lifestyle',
      price: 64.5,
      stock: 32,
      isPremium: true,
      badge: null,
      image: 'https://via.placeholder.com/500x400/1f9e9b/f8efe1?text=Smart+Bottle',
      createdAt: new Date().toISOString(),
    },
    {
      id: 4,
      sku: 'AURA-APR-04',
      name: 'Apricot Balance Set',
      description: 'Kit de cuidado diario para piel mixta.',
      category: 'wellness',
      price: 92.0,
      stock: 15,
      isPremium: true,
      badge: 'Edicion',
      image: 'https://via.placeholder.com/500x400/f59f72/faf7ef?text=Balance+Set',
      createdAt: new Date().toISOString(),
    }
  ]);

  ensureFile(cartsFile, []);
  ensureFile(ordersFile, []);
  ensureFile(reviewsFile, []);
  ensureFile(favoritesFile, []);
  ensureFile(categoriesFile, [
    { id: 'skincare', name: 'Skincare' },
    { id: 'wellness', name: 'Wellness' },
    { id: 'home', name: 'Home' },
    { id: 'lifestyle', name: 'Lifestyle' }
  ]);
}

async function bootstrapDataAsync() {
  const allowDemoAsync = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_USERS === 'true';
  const demoUsersAsync = [
    {
      id: 1,
      name: 'Admin Ganesh',
      email: 'admin@elrinconazul.com',
      passwordHash: bcrypt.hashSync('Admin1234', 10),
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Cliente Demo',
      email: 'cliente@elrinconazul.com',
      passwordHash: bcrypt.hashSync('Cliente1234', 10),
      role: 'user',
      createdAt: new Date().toISOString(),
    },
  ];

  if (allowDemoAsync) {
    if (process.env.NODE_ENV === 'test') {
      await writeJsonAsync(usersFile, demoUsersAsync);
    } else {
      await ensureFileAsync(usersFile, demoUsersAsync);
    }
  } else {
    await ensureFileAsync(usersFile, []);
  }

  await ensureFileAsync(productsFile, [
    {
      id: 1,
      sku: 'AURA-ESSENCE-01',
      name: 'Auroral Essence',
      description: 'Serum luminoso con extractos botanicos del norte.',
      category: 'skincare',
      price: 49.99,
      stock: 45,
      isPremium: false,
      badge: 'Nuevo',
      image: 'https://via.placeholder.com/500x400/0f6f7f/f3efe5?text=Auroral+Essence',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      sku: 'AURA-RELAX-02',
      name: 'Linen Calm Diffuser',
      description: 'Difusor con notas limpias y acabado premium.',
      category: 'home',
      price: 79.0,
      stock: 20,
      isPremium: false,
      badge: null,
      image: 'https://via.placeholder.com/500x400/0b3c5d/f7f1e3?text=Linen+Calm',
      createdAt: new Date().toISOString(),
    },
    {
      id: 3,
      sku: 'AURA-DIGI-03',
      name: 'Teal Smart Bottle',
      description: 'Botella termica conectada con recordatorio inteligente.',
      category: 'lifestyle',
      price: 64.5,
      stock: 32,
      isPremium: true,
      badge: null,
      image: 'https://via.placeholder.com/500x400/1f9e9b/f8efe1?text=Smart+Bottle',
      createdAt: new Date().toISOString(),
    },
    {
      id: 4,
      sku: 'AURA-APR-04',
      name: 'Apricot Balance Set',
      description: 'Kit de cuidado diario para piel mixta.',
      category: 'wellness',
      price: 92.0,
      stock: 15,
      isPremium: true,
      badge: 'Edicion',
      image: 'https://via.placeholder.com/500x400/f59f72/faf7ef?text=Balance+Set',
      createdAt: new Date().toISOString(),
    }
  ]);

  await ensureFileAsync(cartsFile, []);
  await ensureFileAsync(ordersFile, []);
  await ensureFileAsync(reviewsFile, []);
  await ensureFileAsync(favoritesFile, []);
  await ensureFileAsync(categoriesFile, [
    { id: 'skincare', name: 'Skincare' },
    { id: 'wellness', name: 'Wellness' },
    { id: 'home', name: 'Home' },
    { id: 'lifestyle', name: 'Lifestyle' }
  ]);
}

// Helper: prefer DB adapter if present
function prefer(dbFn, fileFn) {
  return dbAdapter && typeof dbAdapter[dbFn] === 'function' ? dbAdapter[dbFn].bind(dbAdapter) : fileFn;
}

function getUsers() {
  return prefer('getUsersAsync', () => readJson(usersFile))();
}

async function getUsersAsync() {
  return dbAdapter ? await dbAdapter.getUsersAsync() : await readJsonAsync(usersFile);
}

function saveUsers(payload) {
  if (dbAdapter) return dbAdapter.saveUsersAsync(payload);
  writeJson(usersFile, payload);
}

async function saveUsersAsync(payload) {
  if (dbAdapter) return dbAdapter.saveUsersAsync(payload);
  await writeJsonAsync(usersFile, payload);
}

function getProducts() {
  return dbAdapter ? dbAdapter.getProductsAsync() : readJson(productsFile);
}

async function getProductsAsync() {
  if (dbAdapter) return dbAdapter.getProductsAsync();
  return await readJsonAsync(productsFile);
}

function saveProducts(payload) {
  if (dbAdapter) return dbAdapter.saveProductsAsync(payload);
  writeJson(productsFile, payload);
}

async function saveProductsAsync(payload) {
  if (dbAdapter) return dbAdapter.saveProductsAsync(payload);
  await writeJsonAsync(productsFile, payload);
}

function getCarts() {
  return dbAdapter ? dbAdapter.getCartsAsync() : readJson(cartsFile);
}

async function getCartsAsync() {
  if (dbAdapter) return dbAdapter.getCartsAsync();
  return await readJsonAsync(cartsFile);
}

function saveCarts(payload) {
  if (dbAdapter) return dbAdapter.saveCartsAsync(payload);
  writeJson(cartsFile, payload);
}

async function saveCartsAsync(payload) {
  if (dbAdapter) return dbAdapter.saveCartsAsync(payload);
  await writeJsonAsync(cartsFile, payload);
}

function getOrders() {
  return dbAdapter ? dbAdapter.getOrdersAsync() : readJson(ordersFile);
}

async function getOrdersAsync() {
  if (dbAdapter) return dbAdapter.getOrdersAsync();
  return await readJsonAsync(ordersFile);
}

function saveOrders(payload) {
  if (dbAdapter) return dbAdapter.saveOrdersAsync(payload);
  writeJson(ordersFile, payload);
}

async function saveOrdersAsync(payload) {
  if (dbAdapter) return dbAdapter.saveOrdersAsync(payload);
  await writeJsonAsync(ordersFile, payload);
}

module.exports = {
  bootstrapData,
  bootstrapDataAsync,
  getUsers,
  getUsersAsync,
  saveUsers,
  saveUsersAsync,
  getProducts,
  getProductsAsync,
  saveProducts,
  saveProductsAsync,
  getCarts,
  getCartsAsync,
  saveCarts,
  saveCartsAsync,
  getOrders,
  getOrdersAsync,
  saveOrders,
  saveOrdersAsync,
  getReviews,
  getReviewsAsync,
  saveReviews,
  saveReviewsAsync,
  getFavorites,
  getFavoritesAsync,
  saveFavorites,
  saveFavoritesAsync,
  getCategories,
  getCategoriesAsync,
  saveCategories,
  saveCategoriesAsync,
};

function getReviews() {
  return readJson(reviewsFile);
}

async function getReviewsAsync() {
  return await readJsonAsync(reviewsFile);
}

function saveReviews(payload) {
  writeJson(reviewsFile, payload);
}

async function saveReviewsAsync(payload) {
  await writeJsonAsync(reviewsFile, payload);
}

function getFavorites() {
  return readJson(favoritesFile);
}

async function getFavoritesAsync() {
  return await readJsonAsync(favoritesFile);
}

function saveFavorites(payload) {
  writeJson(favoritesFile, payload);
}

async function saveFavoritesAsync(payload) {
  await writeJsonAsync(favoritesFile, payload);
}

function getCategories() {
  return readJson(categoriesFile);
}

async function getCategoriesAsync() {
  return await readJsonAsync(categoriesFile);
}

function saveCategories(payload) {
  writeJson(categoriesFile, payload);
}

async function saveCategoriesAsync(payload) {
  await writeJsonAsync(categoriesFile, payload);
}
