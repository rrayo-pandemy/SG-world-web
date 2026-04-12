const path = require('path');
const bcrypt = require('bcryptjs');
const { ensureDir, ensureFile, readJson, writeJson } = require('../utils/fileDb');

const dataDir = path.join(__dirname, '..', 'data');
const usersFile = path.join(dataDir, 'users.json');
const productsFile = path.join(dataDir, 'products.json');
const cartsFile = path.join(dataDir, 'carts.json');
const ordersFile = path.join(dataDir, 'orders.json');

function bootstrapData() {
  ensureDir(dataDir);

  const adminPassword = bcrypt.hashSync('Admin1234', 10);
  const customerPassword = bcrypt.hashSync('Cliente1234', 10);

  ensureFile(usersFile, [
    {
      id: 1,
      name: 'Admin AuraMarket',
      email: 'admin@auramarket.com',
      passwordHash: adminPassword,
      role: 'admin',
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: 'Cliente Demo',
      email: 'cliente@auramarket.com',
      passwordHash: customerPassword,
      role: 'customer',
      createdAt: new Date().toISOString(),
    },
  ]);

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
}

function getUsers() {
  return readJson(usersFile);
}

function saveUsers(payload) {
  writeJson(usersFile, payload);
}

function getProducts() {
  return readJson(productsFile);
}

function saveProducts(payload) {
  writeJson(productsFile, payload);
}

function getCarts() {
  return readJson(cartsFile);
}

function saveCarts(payload) {
  writeJson(cartsFile, payload);
}

function getOrders() {
  return readJson(ordersFile);
}

function saveOrders(payload) {
  writeJson(ordersFile, payload);
}

module.exports = {
  bootstrapData,
  getUsers,
  saveUsers,
  getProducts,
  saveProducts,
  getCarts,
  saveCarts,
  getOrders,
  saveOrders,
};
