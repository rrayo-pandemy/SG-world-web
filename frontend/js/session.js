/* ============================================
   SESSION MANAGEMENT
   ============================================ */

(function initSessionManager() {
  const STORAGE_USER_KEY = 'ElRinconAzul_current_user';
  const STORAGE_TOKEN_KEY = 'authToken';
  const STORAGE_EMAIL_KEY = 'userEmail';
  const STORAGE_PREMIUM_KEY = 'premiumLogged';
  const STORAGE_NORMAL_KEY = 'normalLogged';

  class SessionManager {
    constructor() {
      this.user = this.readStoredUser();
      this.render();
      this.bindEvents();
      this.hydrate();
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

      if (window.location.port === '8000') {
        addCandidate(window.location.protocol + '//' + window.location.hostname + ':5000');
      }
      addCandidate('');
      return candidates;
    }

    buildApiUrl(base, path) {
      if (/^https?:\/\//i.test(path)) return path;
      return base ? `${base}${path}` : path;
    }

    normalizeUser(rawUser) {
      if (!rawUser || typeof rawUser !== 'object') return null;

      return {
        id: Number(rawUser.id),
        name: String(rawUser.name || 'Cliente').trim() || 'Cliente',
        email: String(rawUser.email || '').trim().toLowerCase(),
        role: String(rawUser.role || 'customer').trim().toLowerCase(),
        isPremium: Boolean(rawUser.isPremium),
      };
    }

    readStoredUser() {
      try {
        const raw = localStorage.getItem(STORAGE_USER_KEY);
        if (!raw) return null;
        return this.normalizeUser(JSON.parse(raw));
      } catch (_error) {
        return null;
      }
    }

    persistUser(user) {
      const normalizedUser = this.normalizeUser(user);
      this.user = normalizedUser;

      try {
        if (!normalizedUser) {
          localStorage.removeItem(STORAGE_USER_KEY);
          localStorage.removeItem(STORAGE_EMAIL_KEY);
          localStorage.removeItem(STORAGE_PREMIUM_KEY);
          localStorage.removeItem(STORAGE_NORMAL_KEY);
          return;
        }

        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(normalizedUser));
        if (normalizedUser.email) localStorage.setItem(STORAGE_EMAIL_KEY, normalizedUser.email);
        localStorage.setItem(STORAGE_PREMIUM_KEY, this.isPremiumUser() ? 'true' : 'false');
        localStorage.setItem(STORAGE_NORMAL_KEY, this.isPremiumUser() ? 'false' : 'true');
      } catch (_error) {
        // Ignore storage errors.
      }
    }

    getAuthToken() {
      try {
        return localStorage.getItem(STORAGE_TOKEN_KEY) || '';
      } catch (_error) {
        return '';
      }
    }

    setAuthToken(token) {
      try {
        if (token) localStorage.setItem(STORAGE_TOKEN_KEY, token);
        else localStorage.removeItem(STORAGE_TOKEN_KEY);
      } catch (_error) {
        // Ignore storage errors.
      }
    }

    isAuthenticated() {
      return Boolean(this.getAuthToken() && this.user && this.user.id);
    }

    isPremiumUser() {
      return Boolean(this.user && (this.user.isPremium || this.user.role === 'admin'));
    }

    getCurrentUser() {
      return this.user ? { ...this.user } : null;
    }

    async fetchCurrentUser() {
      const token = this.getAuthToken();
      if (!token) return { unauthorized: true };

      let unauthorized = false;

      for (const base of this.getApiBaseCandidates()) {
        try {
          const response = await fetch(this.buildApiUrl(base, '/api/v1/me'), {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (response.status === 401) {
            unauthorized = true;
            continue;
          }

          if (!response.ok) continue;

          const data = await response.json();
          if (data && data.user) return { user: data.user };
        } catch (_error) {
          // Try next API base.
        }
      }

      return { unauthorized };
    }

    async hydrate() {
      const token = this.getAuthToken();
      if (!token) {
        this.emitSessionChange();
        return;
      }

      const result = await this.fetchCurrentUser();
      if (result.user) {
        this.persistUser(result.user);
      } else if (result.unauthorized) {
        this.clearSession({ emit: false });
      }

      this.render();
      this.emitSessionChange();
    }

    async handleAuthSuccess(user, token) {
      this.setAuthToken(token || this.getAuthToken());
      this.persistUser(user);
      this.render();
      this.emitSessionChange();
    }

    clearSession({ emit = true } = {}) {
      this.user = null;
      this.setAuthToken('');
      this.persistUser(null);
      this.render();
      if (emit) this.emitSessionChange();
    }

    async logout() {
      this.clearSession({ emit: true });
      document.body.style.overflow = '';
    }

    resolveCartCount() {
      if (window.cartManager && typeof window.cartManager.getItemCount === 'function') {
        return window.cartManager.getItemCount();
      }

      try {
        const cart = JSON.parse(localStorage.getItem('aurora_cart') || '[]');
        return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
      } catch (_error) {
        return 0;
      }
    }

    updateCartSummary(count = this.resolveCartCount()) {
      const label = `Carrito: ${count} producto${count === 1 ? '' : 's'}`;
      document.querySelectorAll('[data-auth-cart]').forEach((element) => {
        element.textContent = label;
      });
    }

    emitSessionChange() {
      document.dispatchEvent(
        new CustomEvent('ElRinconAzul:session-changed', {
          detail: {
            authenticated: this.isAuthenticated(),
            isPremium: this.isPremiumUser(),
            user: this.getCurrentUser(),
          },
        })
      );
    }

    handlePremiumRequest() {
      const message = 'Tu cuenta ya inicio sesion. Para activar Premium, solicita el cambio desde administracion o soporte.';
      if (window.cartManager && typeof window.cartManager.showNotification === 'function') {
        window.cartManager.showNotification(message);
        return;
      }

      window.alert(message);
    }

    bindEvents() {
      document.addEventListener('ElRinconAzul:cart-updated', (event) => {
        const count = Number(event.detail && event.detail.count ? event.detail.count : 0);
        this.updateCartSummary(count);
      });

      document.addEventListener('click', (event) => {
        const logoutButton = event.target.closest('[data-auth-logout]');
        if (logoutButton) {
          event.preventDefault();
          this.logout();
          return;
        }

        const premiumButton = event.target.closest('[data-premium-cta]');
        if (!premiumButton) return;
        if (!this.isAuthenticated() || this.isPremiumUser()) return;
        if (premiumButton.classList.contains('premium-login')) return;

        event.preventDefault();
        this.handlePremiumRequest();
      });

      window.addEventListener('storage', (event) => {
        if (!event.key) return;
        if (![STORAGE_TOKEN_KEY, STORAGE_USER_KEY, STORAGE_PREMIUM_KEY, STORAGE_NORMAL_KEY].includes(event.key)) return;

        this.user = this.readStoredUser();
        this.render();
        this.emitSessionChange();
      });
    }

    renderPremiumCtas() {
      const authenticated = this.isAuthenticated();
      const isPremium = this.isPremiumUser();

      document.querySelectorAll('[data-premium-cta]').forEach((button) => {
        button.disabled = false;

        if (!authenticated) {
          button.textContent = 'Acceder como Premium';
          if (!button.classList.contains('premium-login')) button.classList.add('premium-login');
          return;
        }

        if (isPremium) {
          button.textContent = 'Premium activo';
          button.classList.remove('premium-login');
          button.disabled = true;
          return;
        }

        button.textContent = 'Hacerme Premium';
        button.classList.remove('premium-login');
      });

      document.querySelectorAll('[data-premium-upgrade]').forEach((button) => {
        button.hidden = !authenticated || isPremium;
      });
    }

    render() {
      const authenticated = this.isAuthenticated();
      const userName = authenticated ? this.user.name : 'Cliente';

      document.querySelectorAll('[data-auth-login]').forEach((element) => {
        element.hidden = authenticated;
      });

      document.querySelectorAll('[data-auth-panel]').forEach((element) => {
        element.hidden = !authenticated;
      });

      document.querySelectorAll('[data-auth-name]').forEach((element) => {
        element.textContent = userName;
      });

      this.updateCartSummary();
      this.renderPremiumCtas();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager = new SessionManager();
  });
})();
