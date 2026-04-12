/* ============================================
   AURAMARKET FRONTEND APP
   ============================================ */

const APP_PRODUCTS = [
  {
    id: 1,
    name: 'Auroral Essence',
    description: 'Serum luminoso para rutina diaria premium.',
    price: 49.99,
    badge: 'Nuevo',
    category: 'skincare',
    isPremium: false,
    image: 'https://img.freepik.com/premium-photo/digital-aurora-essence_1029473-34104.jpg?w=996',
  },
  {
    id: 2,
    name: 'Glacial Shield',
    description: 'Crema protectora con hidratacion profunda.',
    price: 64.99,
    badge: null,
    category: 'skincare',
    isPremium: false,
    image: 'https://via.placeholder.com/400x320/0b3c5d/f7f1e3?text=Glacial+Shield',
  },
  {
    id: 3,
    name: 'Teal Smart Bottle',
    description: 'Botella termica con recordatorios inteligentes.',
    price: 64.5,
    badge: 'Promo',
    category: 'lifestyle',
    isPremium: true,
    image: 'https://via.placeholder.com/400x320/1f9e9b/f8efe1?text=Smart+Bottle',
  },
  {
    id: 4,
    name: 'Apricot Balance Set',
    description: 'Set de bienestar para una rutina completa.',
    price: 92.0,
    badge: 'Top',
    category: 'wellness',
    isPremium: true,
    image: 'https://via.placeholder.com/400x320/f59f72/faf7ef?text=Balance+Set',
  },
  {
    id: 5,
    name: 'Linen Calm Diffuser',
    description: 'Difusor hogar con aroma limpio y calmante.',
    price: 79.0,
    badge: null,
    category: 'home',
    isPremium: false,
    image: 'https://via.placeholder.com/400x320/a8b9a5/f8f4ec?text=Calm+Diffuser',
  },
  {
    id: 6,
    name: 'Midnight Repair Mask',
    description: 'Mascarilla nocturna de regeneracion avanzada.',
    price: 59.99,
    badge: null,
    category: 'skincare',
    isPremium: true,
    image: 'https://via.placeholder.com/400x320/2f3e56/f8f1ea?text=Repair+Mask',
  },
  {
    id: 7,
    name: 'Data Flow Lamp',
    description: 'Lampara minimalista con luz ambiental inteligente.',
    price: 84.0,
    badge: 'Edicion',
    category: 'home',
    isPremium: false,
    image: 'https://via.placeholder.com/400x320/254c66/ece7dd?text=Data+Lamp',
  },
  {
    id: 8,
    name: 'Core Wellness Journal',
    description: 'Diario guiado para seguimiento personal diario.',
    price: 34.5,
    badge: null,
    category: 'wellness',
    isPremium: false,
    image: 'https://via.placeholder.com/400x320/c6a988/faf2e8?text=Wellness+Journal',
  },
];

const PRODUCTS_SYNC_KEY = 'auramarket_products_updated_at';

function safeCurrency(value) {
  if (typeof formatCurrency === 'function') return formatCurrency(value);
  return `S/ ${Number(value).toFixed(2)}`;
}

function safeLog(message, type = 'info') {
  if (typeof log === 'function') {
    log(message, type);
  } else {
    console.log(`[${type}] ${message}`);
  }
}

function getProductBadgeClass(badge) {
  const normalized = String(badge || '').trim().toLowerCase();
  if (normalized === 'nuevo') return 'product-badge-nuevo';
  if (normalized === 'edicion') return 'product-badge-edicion';
  return '';
}

function normalizeBadgeLabel(badge) {
  const normalized = String(badge || '').trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'nuevo') return 'Nuevo';
  if (normalized === 'edicion') return 'Edicion';
  return String(badge).trim();
}

class ProductManager {
  constructor() {
    this.products = APP_PRODUCTS.map((product) => ({ ...product }));
    this.activeFilter = 'all';
    this.apiBase = '';
    this.isLoadingProducts = false;
    this.init().catch(() => {
      safeLog('No se pudo inicializar la carga del catalogo desde API.', 'warning');
    });
  }

  getVisibleProducts() {
    if (this.activeFilter === 'all') return this.products;
    return this.products.filter((product) => product.category === this.activeFilter);
  }

  getApiBaseCandidates() {
    const candidates = [];
    const addCandidate = (value) => {
      if (typeof value !== 'string') return;
      const normalized = value.trim().replace(/\/$/, '');
      if (!normalized && normalized !== '') return;
      if (!candidates.includes(normalized)) candidates.push(normalized);
    };

    if (typeof window.API_BASE === 'string' && window.API_BASE.trim()) {
      addCandidate(window.API_BASE);
    }

    addCandidate('');
    addCandidate('http://localhost:5000');
    addCandidate('http://localhost:3000');
    return candidates;
  }

  buildApiUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return this.apiBase ? `${this.apiBase}${path}` : path;
  }

  normalizeProduct(rawProduct) {
    if (!rawProduct || typeof rawProduct !== 'object') return null;
    return {
      ...rawProduct,
      id: Number(rawProduct.id),
      price: Number(rawProduct.price || 0),
      stock: Number(rawProduct.stock || 0),
      isPremium: Boolean(rawProduct.isPremium),
      badge: normalizeBadgeLabel(rawProduct.badge),
    };
  }

  async loadProductsFromApi() {
    const bases = this.getApiBaseCandidates();

    for (const base of bases) {
      try {
        this.apiBase = base;
        const response = await fetch(this.buildApiUrl('/api/v1/products'), {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Error loading products');

        const data = await response.json();
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        return list.map((product) => this.normalizeProduct(product)).filter(Boolean);
      } catch (_error) {
        // Try with next API base.
      }
    }

    return null;
  }

  async refreshProductsFromApi({ silent = false } = {}) {
    if (this.isLoadingProducts) return;

    this.isLoadingProducts = true;
    try {
      const apiProducts = await this.loadProductsFromApi();
      if (!apiProducts) {
        if (!silent) safeLog('API no disponible. Se mantiene el catalogo local.', 'warning');
        return;
      }

      this.products = apiProducts;
      this.renderProducts();
      if (!silent) safeLog(`Catalogo sincronizado desde API (${apiProducts.length} productos).`, 'success');
    } finally {
      this.isLoadingProducts = false;
    }
  }

  bindProductSync() {
    window.addEventListener('storage', (event) => {
      if (event.key !== PRODUCTS_SYNC_KEY) return;
      this.refreshProductsFromApi({ silent: true });
    });
  }

  renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;

    const visibleProducts = this.getVisibleProducts();

    container.innerHTML = visibleProducts
      .map(
        (product, index) => `
        <article class="product-card scroll-reveal ${product.isPremium ? 'product-card--premium' : ''}" data-product-id="${product.id}" style="--reveal-delay:${index * 0.06}s">
          <div class="product-image">
            ${product.badge ? `<span class="product-badge-premium ${getProductBadgeClass(product.badge)}">${product.badge}</span>` : ''}
            ${product.isPremium ? '<span class="product-badge-premium">Premium</span>' : ''}
            <img src="${product.image}" alt="${product.name}" loading="lazy">
          </div>
          <div class="product-content">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-price">
              <span class="product-price-current">${safeCurrency(product.price)}</span>
            </div>
            <div class="product-actions">
              <button class="btn-add-cart" onclick="cartManager.addToCart(${product.id})" data-product-id="${product.id}">
                ${product.isPremium ? 'Solo Premium' : 'Anadir al carrito'}
              </button>
              <a class="btn-product-detail" href="product-detail.html?id=${product.id}" aria-label="Ver detalle de ${product.name}">Detalle</a>
<button 
  class="btn-wishlist" 
  data-wishlist="${product.id}" 
  title="Añadir a favoritos" 
  aria-label="Añadir ${product.name} a favoritos">
  <span class="heart">♡</span>
</button>
            </div>
          </div>
        </article>
      `
      )
      .join('');

    if (window.scrollAnimations && typeof window.scrollAnimations.observeElements === 'function') {
      window.scrollAnimations.observeElements();
    }

    safeLog(`Productos visibles: ${visibleProducts.length}`);
  }

  setFilter(filter) {
    this.activeFilter = filter;

    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
      btn.setAttribute('aria-pressed', btn.dataset.filter === filter ? 'true' : 'false');
    });

    this.renderProducts();
  }

  initFilters() {
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        const filter = btn.dataset.filter || 'all';
        this.setFilter(filter);
      });
    });

    document.querySelectorAll('.nav__dropdown-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const filter = link.dataset.filter || 'all';
        this.setFilter(filter);

        const productsSection = document.getElementById('productos');
        if (productsSection) {
          productsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  async init() {
    this.initFilters();
    this.bindProductSync();
    this.renderProducts();
    await this.refreshProductsFromApi();
  }
}

class Navigation {
  constructor() {
    this.menuToggle = document.querySelector('.menu-toggle');
    this.nav = document.querySelector('.nav');
    this.dropdownToggle = document.querySelector('.nav__item--dropdown > .nav__link');
    this.dropdownItem = document.querySelector('.nav__item--dropdown');
    this.init();
  }

  init() {
    if (this.menuToggle && this.nav) {
      this.menuToggle.addEventListener('click', () => {
        this.menuToggle.classList.toggle('open');
        this.nav.classList.toggle('open');
        this.menuToggle.setAttribute('aria-expanded', this.nav.classList.contains('open') ? 'true' : 'false');
      });
    }

    if (this.dropdownToggle && this.dropdownItem) {
      this.dropdownToggle.addEventListener('click', (event) => {
        event.preventDefault();
        this.dropdownItem.classList.toggle('active');
      });

      document.addEventListener('click', (event) => {
        if (!this.dropdownItem.contains(event.target)) {
          this.dropdownItem.classList.remove('active');
        }
      });
    }
  }
}

class CTAHandler {
  init() {
    document.querySelectorAll('[data-action="scroll-products"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById('productos');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    document.querySelectorAll('[data-action="continue-shopping"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.cartManager) cartManager.closeSidebar();
      });
    });

    document.querySelectorAll('[data-action="checkout"]').forEach((btn) => {
      btn.addEventListener('click', () => this.handleCheckout());
    });
  }

  handleCheckout() {
    if (!window.cartManager) return;

    const cart = cartManager.getCart();
    if (!cart.length) {
      alert('Tu carrito esta vacio');
      return;
    }

    const total = cartManager.calculateTotal();
    const message = `Pedido listo:\n\nItems: ${cart.length}\nTotal: ${safeCurrency(total)}\n\nContinuar al checkout?`;

    if (window.confirm(message)) {
      alert('Pedido confirmado. Recibiras el detalle por correo.');
      cartManager.clearCart();
      cartManager.closeSidebar();
    }
  }
}

class ScrollAnimations {
  constructor() {
    this.observer = null;
    this.init();
  }

  init() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.scroll-reveal').forEach((el) => el.classList.add('visible'));
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    this.observeElements();
  }

  observeElements() {
    if (!this.observer) return;

    document.querySelectorAll('.scroll-reveal').forEach((el) => {
      if (!el.classList.contains('visible')) {
        this.observer.observe(el);
      }
    });
  }
}

class PremiumLogin {
  constructor() {
    this.modal = document.getElementById('premium-login-modal');
    this.openButtons = Array.from(document.querySelectorAll('.premium-login'));
    this.signupLinks = Array.from(document.querySelectorAll('.open-signup'));
    if (!this.modal) return;

    this.overlay = this.modal.querySelector('.modal__overlay');
    this.closeBtn = this.modal.querySelector('.modal__close');
    this.form = this.modal.querySelector('#premium-login-form');
    this.messageEl = this.modal.querySelector('.modal__message');
    this.emailEl = this.modal.querySelector('#premium-email');
    this.passwordEl = this.modal.querySelector('#premium-password');

    this.bindEvents();
  }

  bindEvents() {
    this.openButtons.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        this.open();
      });
    });

    this.signupLinks.forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        this.close();
        if (window.signupModal && typeof window.signupModal.open === 'function') {
          window.signupModal.open();
        }
      });
    });

    if (this.overlay) this.overlay.addEventListener('click', () => this.close());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());

    if (this.form) {
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSubmit();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal.classList.contains('open')) {
        this.close();
      }
    });
  }

  open() {
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (this.messageEl) this.messageEl.textContent = '';
  }

  close() {
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async handleSubmit() {
    const email = this.emailEl ? this.emailEl.value.trim() : '';
    const password = this.passwordEl ? this.passwordEl.value : '';

    if (!email || !password) {
      this.showMessage('Completa email y password.', 'error');
      return;
    }

    const API_BASE = window.API_BASE || 'http://localhost:5000';

    try {
      this.showMessage('Validando acceso...', 'success');
      const response = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        this.showMessage(data.message || 'Credenciales invalidas', 'error');
        return;
      }

      const isPremium = Boolean(data.user?.isPremium) || data.user?.role === 'admin';
      localStorage.setItem('premiumLogged', isPremium ? 'true' : 'false');
      localStorage.setItem('normalLogged', isPremium ? 'false' : 'true');
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      if (data.user?.email) {
        localStorage.setItem('userEmail', data.user.email);
      }

      this.showMessage(isPremium ? 'Acceso premium concedido.' : 'Acceso de cliente activado.', 'success');
      setTimeout(() => this.close(), 650);
    } catch (error) {
      this.showMessage('No se pudo conectar con la API.', 'error');
    }
  }

  showMessage(text, type) {
    if (!this.messageEl) return;
    this.messageEl.textContent = text;
    this.messageEl.className = `modal__message ${type === 'error' ? 'error' : 'success'}`;
  }
}

class SignupModal {
  constructor() {
    this.modal = document.getElementById('signup-modal');
    if (!this.modal) return;

    this.overlay = this.modal.querySelector('.modal__overlay');
    this.closeBtn = this.modal.querySelector('.modal__close');
    this.form = this.modal.querySelector('#signup-form');
    this.messageEl = this.modal.querySelector('.modal__message');
    this.nameEl = this.modal.querySelector('#signup-name');
    this.emailEl = this.modal.querySelector('#signup-email');
    this.passwordEl = this.modal.querySelector('#signup-password');
    this.confirmPasswordEl = this.modal.querySelector('#signup-confirm-password');

    this.bindEvents();
  }

  bindEvents() {
    if (this.overlay) this.overlay.addEventListener('click', () => this.close());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());

    if (this.form) {
      this.form.addEventListener('submit', (event) => {
        event.preventDefault();
        this.handleSubmit();
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.modal.classList.contains('open')) {
        this.close();
      }
    });
  }

  open() {
    this.modal.classList.add('open');
    this.modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (this.messageEl) this.messageEl.textContent = '';
  }

  close() {
    this.modal.classList.remove('open');
    this.modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async handleSubmit() {
    const name = this.nameEl ? this.nameEl.value.trim() : '';
    const email = this.emailEl ? this.emailEl.value.trim() : '';
    const password = this.passwordEl ? this.passwordEl.value : '';
    const confirm = this.confirmPasswordEl ? this.confirmPasswordEl.value : '';

    if (!name || !email || !password || !confirm) {
      this.showMessage('Completa todos los campos.', 'error');
      return;
    }

    if (password.length < 8) {
      this.showMessage('La contrasena debe tener al menos 8 caracteres.', 'error');
      return;
    }
    if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
      this.showMessage('La contrasena debe incluir una mayuscula y un numero.', 'error');
      return;
    }

    if (password !== confirm) {
      this.showMessage('Las contrasenas no coinciden.', 'error');
      return;
    }

    const API_BASE = window.API_BASE || 'http://localhost:5000';
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        this.showMessage(data.message || 'No se pudo registrar la cuenta.', 'error');
        return;
      }

      localStorage.setItem('normalLogged', 'true');
      localStorage.setItem('premiumLogged', 'false');
      localStorage.setItem('userEmail', email);
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }
      this.showMessage('Cuenta creada correctamente. Ya puedes iniciar sesion.', 'success');
      setTimeout(() => this.close(), 700);
    } catch (error) {
      this.showMessage('No se pudo conectar con la API.', 'error');
    }
  }

  showMessage(text, type) {
    if (!this.messageEl) return;
    this.messageEl.textContent = text;
    this.messageEl.className = `modal__message ${type === 'error' ? 'error' : 'success'}`;
  }
}

function setupWishlist() {
  document.addEventListener('click', (event) => {
    const button = event.target.closest('.btn-wishlist');
    if (!button) return;

    event.preventDefault();
    button.classList.toggle('active');
    button.textContent = button.classList.contains('active') ? '♥' : '♡';
  });
}

let productManager;
let navigation;
let ctaHandler;
let scrollAnimations;
let premiumLogin;
let signupModal;

document.addEventListener('DOMContentLoaded', () => {
  productManager = new ProductManager();
  navigation = new Navigation();
  ctaHandler = new CTAHandler();
  ctaHandler.init();
  scrollAnimations = new ScrollAnimations();
  premiumLogin = new PremiumLogin();
  signupModal = new SignupModal();
  setupWishlist();

  window.productManager = productManager;
  window.navigation = navigation;
  window.scrollAnimations = scrollAnimations;
  window.premiumLogin = premiumLogin;
  window.signupModal = signupModal;

  safeLog('Frontend inicializado correctamente', 'success');
});
