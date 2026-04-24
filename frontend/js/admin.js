const API_BASE = window.API_BASE || 'http://localhost:5000';

const state = {
  token: localStorage.getItem('adminAuthToken') || '',
  currentUser: null,
  users: [],
  products: [],
};

const els = {
  loginCard: document.getElementById('login-card'),
  adminPanel: document.getElementById('admin-panel'),
  loginForm: document.getElementById('admin-login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  logoutBtn: document.getElementById('logout-btn'),
  refreshUsers: document.getElementById('refresh-users'),
  usersTbody: document.getElementById('users-tbody'),
  createForm: document.getElementById('create-user-form'),
  createName: document.getElementById('create-name'),
  createEmail: document.getElementById('create-email'),
  createPassword: document.getElementById('create-password'),
  createRole: document.getElementById('create-role'),
  createPremium: document.getElementById('create-premium'),
  editForm: document.getElementById('edit-user-form'),
  editId: document.getElementById('edit-id'),
  editName: document.getElementById('edit-name'),
  editEmail: document.getElementById('edit-email'),
  editPassword: document.getElementById('edit-password'),
  editRole: document.getElementById('edit-role'),
  editPremium: document.getElementById('edit-premium'),
  cancelEdit: document.getElementById('cancel-edit'),
  refreshProducts: document.getElementById('refresh-products'),
  createProductForm: document.getElementById('create-product-form'),
  createProductSku: document.getElementById('create-product-sku'),
  createProductName: document.getElementById('create-product-name'),
  createProductDescription: document.getElementById('create-product-description'),
  createProductCategory: document.getElementById('create-product-category'),
  createProductPrice: document.getElementById('create-product-price'),
  createProductStock: document.getElementById('create-product-stock'),
  createProductImage: document.getElementById('create-product-image'),
  createProductPremium: document.getElementById('create-product-premium'),
  createProductBadgeNuevo: document.getElementById('create-product-badge-nuevo'),
  createProductBadgeEdicion: document.getElementById('create-product-badge-edicion'),
  productsTbody: document.getElementById('products-tbody'),
  editProductForm: document.getElementById('edit-product-form'),
  productEditId: document.getElementById('product-edit-id'),
  productEditSku: document.getElementById('product-edit-sku'),
  productEditName: document.getElementById('product-edit-name'),
  productEditDescription: document.getElementById('product-edit-description'),
  productEditCategory: document.getElementById('product-edit-category'),
  productEditPrice: document.getElementById('product-edit-price'),
  productEditStock: document.getElementById('product-edit-stock'),
  productEditImage: document.getElementById('product-edit-image'),
  productEditPremium: document.getElementById('product-edit-premium'),
  productEditBadgeNuevo: document.getElementById('product-edit-badge-nuevo'),
  productEditBadgeEdicion: document.getElementById('product-edit-badge-edicion'),
  cancelProductEdit: document.getElementById('cancel-product-edit'),
  toast: document.getElementById('toast'),
};

function removeUnexpectedProductDetailEditor() {
  const nodes = [
    document.getElementById('admin-product-editor'),
    document.getElementById('admin-edit-form'),
    document.getElementById('admin-edit-status'),
  ].filter(Boolean);

  nodes.forEach((node) => {
    if (node && typeof node.remove === 'function') {
      node.remove();
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function notify(message, isError = false) {
  if (!els.toast) return;
  els.toast.textContent = message;
  els.toast.style.background = isError ? 'var(--danger)' : 'var(--toast-bg)';
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2600);
}

async function api(path, options = {}, useAuth = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (useAuth && state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.message || payload.error || 'Error de servidor';
    throw new Error(message);
  }

  return payload;
}

function setAuthenticatedUI(isAuthenticated) {
  if (els.loginCard) els.loginCard.classList.toggle('hidden', isAuthenticated);
  if (els.adminPanel) els.adminPanel.classList.toggle('hidden', !isAuthenticated);
  if (els.logoutBtn) {
    els.logoutBtn.classList.toggle('hidden', !isAuthenticated);
  }
}

function persistToken(token) {
  state.token = token || '';
  if (state.token) {
    localStorage.setItem('adminAuthToken', state.token);
  } else {
    localStorage.removeItem('adminAuthToken');
  }
}

async function loadDashboardData() {
  await Promise.all([loadUsers(), loadProducts()]);
}

async function login(email, password) {
  const data = await api(
    '/api/v1/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    false
  );

  if (!data.user || data.user.role !== 'admin') {
    throw new Error('Este panel es solo para administradores');
  }

  persistToken(data.token);
  state.currentUser = data.user;
  setAuthenticatedUI(true);
  notify('Sesion iniciada como admin');
  await loadDashboardData();
}

async function logout() {
  try {
    await api('/api/v1/auth/logout', { method: 'POST' }, false);
  } catch {
    // ignore
  }
  persistToken('');
  state.currentUser = null;
  setAuthenticatedUI(false);
  clearEditForm();
  clearCreateProductForm();
  clearProductEditForm();
  notify('Sesion cerrada');
}

async function bootstrapAuth() {
  if (!state.token) {
    setAuthenticatedUI(false);
    return;
  }

  try {
    const data = await api('/api/v1/me');
    if (!data.user || data.user.role !== 'admin') {
      throw new Error('Sin permisos de admin');
    }
    state.currentUser = data.user;
    setAuthenticatedUI(true);
    await loadDashboardData();
  } catch {
    persistToken('');
    setAuthenticatedUI(false);
  }
}

function renderUsers() {
  if (!els.usersTbody) return;
  els.usersTbody.innerHTML = '';

  state.users.forEach((user) => {
    const tr = document.createElement('tr');
    const safeName = escapeHtml(user.name);
    const safeEmail = escapeHtml(user.email);
    const safeRole = escapeHtml(user.role);

    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${safeName}</td>
      <td>${safeEmail}</td>
      <td>${safeRole}</td>
      <td><span class="badge ${user.isPremium ? 'premium' : 'normal'}">${user.isPremium ? 'Premium' : 'Normal'}</span></td>
      <td>${new Date(user.createdAt).toLocaleString()}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-action="edit" data-id="${user.id}">Editar</button>
          <button type="button" data-action="premium" data-id="${user.id}">${user.isPremium ? 'Quitar premium' : 'Hacer premium'}</button>
          <button type="button" class="delete" data-action="delete" data-id="${user.id}">Eliminar</button>
        </div>
      </td>
    `;

    els.usersTbody.appendChild(tr);
  });
}

async function loadUsers() {
  const data = await api('/api/v1/users');
  state.users = data.data || [];
  renderUsers();
}

function clearEditForm() {
  if (!els.editForm) return;
  els.editForm.classList.add('hidden');
  els.editId.value = '';
  els.editName.value = '';
  els.editEmail.value = '';
  els.editPassword.value = '';
  els.editRole.value = 'user';
  els.editPremium.checked = false;
}

function normalizeProductBadge(badge) {
  const normalized = String(badge || '').trim().toLowerCase();
  if (normalized === 'nuevo') return 'nuevo';
  if (normalized === 'edicion') return 'edicion';
  return '';
}

function syncBadgeChecks(nuevoEl, edicionEl, activeBadge = '') {
  const normalized = normalizeProductBadge(activeBadge);
  if (nuevoEl) nuevoEl.checked = normalized === 'nuevo';
  if (edicionEl) edicionEl.checked = normalized === 'edicion';
}

function syncProductBadgeChecks(activeBadge = '') {
  syncBadgeChecks(els.productEditBadgeNuevo, els.productEditBadgeEdicion, activeBadge);
}

function syncCreateProductBadgeChecks(activeBadge = '') {
  syncBadgeChecks(els.createProductBadgeNuevo, els.createProductBadgeEdicion, activeBadge);
}

function getSelectedBadgeValue(nuevoEl, edicionEl) {
  if (nuevoEl && nuevoEl.checked) return 'Nuevo';
  if (edicionEl && edicionEl.checked) return 'Edicion';
  return null;
}

function getSelectedProductBadge() {
  return getSelectedBadgeValue(els.productEditBadgeNuevo, els.productEditBadgeEdicion);
}

function getSelectedCreateProductBadge() {
  return getSelectedBadgeValue(els.createProductBadgeNuevo, els.createProductBadgeEdicion);
}

function clearCreateProductForm() {
  if (!els.createProductForm) return;
  els.createProductForm.reset();
  syncCreateProductBadgeChecks('');
}

function attachExclusiveBadgeBehavior(primaryEl, secondaryEl) {
  if (!primaryEl) return;
  primaryEl.addEventListener('change', () => {
    if (primaryEl.checked && secondaryEl) {
      secondaryEl.checked = false;
    }
  });
}

function startEditUser(userId) {
  const user = state.users.find((u) => u.id === Number(userId));
  if (!user || !els.editForm) return;

  els.editId.value = String(user.id);
  els.editName.value = user.name;
  els.editEmail.value = user.email;
  els.editPassword.value = '';
  els.editRole.value = user.role;
  els.editPremium.checked = !!user.isPremium;
  els.editForm.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function createUser(event) {
  event.preventDefault();

  const payload = {
    name: els.createName.value.trim(),
    email: els.createEmail.value.trim(),
    password: els.createPassword.value,
    role: els.createRole.value,
    isPremium: els.createPremium.checked,
  };

  await api('/api/v1/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  event.target.reset();
  notify('Usuario creado');
  await loadUsers();
}

async function updateUser(event) {
  event.preventDefault();

  const id = Number(els.editId.value);
  const payload = {
    name: els.editName.value.trim(),
    email: els.editEmail.value.trim(),
    role: els.editRole.value,
    isPremium: els.editPremium.checked,
  };

  const newPassword = els.editPassword.value.trim();
  if (newPassword) {
    payload.password = newPassword;
  }

  await api(`/api/v1/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  clearEditForm();
  notify('Usuario actualizado');
  await loadUsers();
}

async function togglePremium(userId) {
  const user = state.users.find((u) => u.id === Number(userId));
  if (!user) return;

  await api(`/api/v1/users/${user.id}/premium`, {
    method: 'PATCH',
    body: JSON.stringify({ isPremium: !user.isPremium }),
  });

  notify('Estado premium actualizado');
  await loadUsers();
}

async function deleteUser(userId) {
  const user = state.users.find((u) => u.id === Number(userId));
  if (!user) return;

  if (!window.confirm(`Eliminar a ${user.name}?`)) return;

  await api(`/api/v1/users/${user.id}`, { method: 'DELETE' });
  notify('Usuario eliminado');
  await loadUsers();
}

function renderProducts() {
  if (!els.productsTbody) return;
  els.productsTbody.innerHTML = '';

  state.products.forEach((product) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${product.id}</td>
      <td>${escapeHtml(product.sku || '')}</td>
      <td>${escapeHtml(product.name || '')}</td>
      <td>${escapeHtml(product.category || '')}</td>
      <td>S/. ${Number(product.price || 0).toFixed(2)}</td>
      <td>${Number(product.stock || 0)}</td>
      <td><span class="badge ${product.isPremium ? 'premium' : 'normal'}">${product.isPremium ? 'Premium' : 'Normal'}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" data-action="edit-product" data-id="${product.id}">Editar</button>
        </div>
      </td>
    `;
    els.productsTbody.appendChild(tr);
  });
}

async function loadProducts() {
  const data = await api('/api/v1/products', {}, false);
  state.products = data.data || [];
  renderProducts();
}

async function createProduct(event) {
  event.preventDefault();

  const payload = {
    sku: els.createProductSku.value.trim() || undefined,
    name: els.createProductName.value.trim(),
    description: els.createProductDescription.value.trim(),
    category: els.createProductCategory.value.trim(),
    price: Number(els.createProductPrice.value),
    stock: Number(els.createProductStock.value),
    image: els.createProductImage.value.trim() || undefined,
    isPremium: els.createProductPremium.checked,
    badge: getSelectedCreateProductBadge(),
  };

  await api('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  clearCreateProductForm();
  notify('Producto agregado');
  try {
    localStorage.setItem('ElRinconAzul_products_updated_at', String(Date.now()));
  } catch {
    // ignore
  }
  await loadProducts();
}

function clearProductEditForm() {
  if (!els.editProductForm) return;
  els.editProductForm.classList.add('hidden');
  els.productEditId.value = '';
  els.productEditSku.value = '';
  els.productEditName.value = '';
  els.productEditDescription.value = '';
  els.productEditCategory.value = '';
  els.productEditPrice.value = '';
  els.productEditStock.value = '';
  els.productEditImage.value = '';
  els.productEditPremium.checked = false;
  syncProductBadgeChecks('');
}

function startEditProduct(productId) {
  const product = state.products.find((p) => p.id === Number(productId));
  if (!product || !els.editProductForm) return;

  els.productEditId.value = String(product.id);
  els.productEditSku.value = product.sku || '';
  els.productEditName.value = product.name || '';
  els.productEditDescription.value = product.description || '';
  els.productEditCategory.value = product.category || '';
  els.productEditPrice.value = Number(product.price || 0);
  els.productEditStock.value = Number(product.stock || 0);
  els.productEditImage.value = product.image || '';
  els.productEditPremium.checked = !!product.isPremium;
  syncProductBadgeChecks(product.badge);

  els.editProductForm.classList.remove('hidden');
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

async function updateProduct(event) {
  event.preventDefault();

  const id = Number(els.productEditId.value);
  const payload = {
    sku: els.productEditSku.value.trim(),
    name: els.productEditName.value.trim(),
    description: els.productEditDescription.value.trim(),
    category: els.productEditCategory.value.trim(),
    price: Number(els.productEditPrice.value),
    stock: Number(els.productEditStock.value),
    image: els.productEditImage.value.trim(),
    isPremium: els.productEditPremium.checked,
    badge: getSelectedProductBadge(),
  };

  await api(`/api/v1/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  clearProductEditForm();
  notify('Producto actualizado');
  try {
    localStorage.setItem('ElRinconAzul_products_updated_at', String(Date.now()));
  } catch {
    // ignore
  }
  await loadProducts();
}

function bindEvents() {
  if (els.loginForm) {
    els.loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await login(els.loginEmail.value.trim(), els.loginPassword.value);
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener('click', async () => {
      await logout();
    });
  }

  if (els.refreshUsers) {
    els.refreshUsers.addEventListener('click', async () => {
      try {
        await loadUsers();
        notify('Usuarios actualizados');
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.refreshProducts) {
    els.refreshProducts.addEventListener('click', async () => {
      try {
        await loadProducts();
        notify('Productos actualizados');
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.createForm) {
    els.createForm.addEventListener('submit', async (event) => {
      try {
        await createUser(event);
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.createProductForm) {
    els.createProductForm.addEventListener('submit', async (event) => {
      try {
        await createProduct(event);
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.editForm) {
    els.editForm.addEventListener('submit', async (event) => {
      try {
        await updateUser(event);
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.editProductForm) {
    els.editProductForm.addEventListener('submit', async (event) => {
      try {
        await updateProduct(event);
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.cancelEdit) {
    els.cancelEdit.addEventListener('click', () => {
      clearEditForm();
    });
  }

  if (els.cancelProductEdit) {
    els.cancelProductEdit.addEventListener('click', () => {
      clearProductEditForm();
    });
  }

  attachExclusiveBadgeBehavior(els.productEditBadgeNuevo, els.productEditBadgeEdicion);
  attachExclusiveBadgeBehavior(els.productEditBadgeEdicion, els.productEditBadgeNuevo);
  attachExclusiveBadgeBehavior(els.createProductBadgeNuevo, els.createProductBadgeEdicion);
  attachExclusiveBadgeBehavior(els.createProductBadgeEdicion, els.createProductBadgeNuevo);

  if (els.usersTbody) {
    els.usersTbody.addEventListener('click', async (event) => {
      const btn = event.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const userId = Number(btn.dataset.id);

      try {
        if (action === 'edit') startEditUser(userId);
        if (action === 'premium') await togglePremium(userId);
        if (action === 'delete') await deleteUser(userId);
      } catch (error) {
        notify(error.message, true);
      }
    });
  }

  if (els.productsTbody) {
    els.productsTbody.addEventListener('click', (event) => {
      const btn = event.target.closest('button[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'edit-product') {
        startEditProduct(Number(btn.dataset.id));
      }
    });
  }
}

(async function init() {
  removeUnexpectedProductDetailEditor();
  bindEvents();
  await bootstrapAuth();
})();

