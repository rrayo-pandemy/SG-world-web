/**
 * PRODUCT DETAIL PAGE - JavaScript
 * Handles product detail, recommendations, cart actions, and admin editing.
 */

class ProductDetailManager {
    constructor() {
        this.productId = this.getProductIdFromURL();
        this.products = [];
        this.currentProduct = null;
        this.quantity = 1;
        this.apiBase = '';
        this.apiAvailable = false;
        this.isAdminSession = this.hasAdminRole();
        this.init();
    }

    getProductIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('id'), 10) || 1;
    }

    getApiBaseCandidates() {
        const candidates = [];
        const pushCandidate = (value) => {
            if (typeof value !== 'string') return;
            const normalized = value.trim().replace(/\/$/, '');
            if (!normalized && normalized !== '') return;
            if (!candidates.includes(normalized)) candidates.push(normalized);
        };

        if (typeof window.API_BASE === 'string' && window.API_BASE.trim()) {
            pushCandidate(window.API_BASE);
        }

        // Same origin first for integrated deployments.
        pushCandidate('');

        // Common local backend ports used in this project.
        pushCandidate('http://localhost:5000');
        pushCandidate('http://localhost:3000');

        return candidates;
    }

    buildApiUrl(path) {
        if (/^https?:\/\//i.test(path)) return path;
        return this.apiBase ? `${this.apiBase}${path}` : path;
    }

    getAuthToken() {
        return localStorage.getItem('authToken') || '';
    }

    getAuthHeaders() {
        const token = this.getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    decodeJwtPayload(token) {
        try {
            const payloadBase64 = token.split('.')[1];
            if (!payloadBase64) return null;

            const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
            const jsonText = atob(padded);
            return JSON.parse(jsonText);
        } catch (_error) {
            return null;
        }
    }

    hasAdminRole() {
        const token = this.getAuthToken();
        if (!token) return false;

        const payload = this.decodeJwtPayload(token);
        return payload && payload.role === 'admin';
    }

    async init() {
        try {
            await this.loadProducts();
            await this.detectAdminSession();
            this.loadProductDetail();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing ProductDetailManager:', error);
        }
    }

    async loadProducts() {
        const bases = this.getApiBaseCandidates();

        for (const base of bases) {
            try {
                this.apiBase = base;
                const response = await fetch(this.buildApiUrl('/api/v1/products'), {
                    credentials: 'include',
                });
                if (!response.ok) throw new Error('Failed loading products');

                const data = await response.json();
                this.products = data.data || data;
                this.apiAvailable = true;
                return;
            } catch (_error) {
                this.apiAvailable = false;
            }
        }

        console.warn('API unavailable, using mock product data');
        this.products = this.getMockProducts();
        this.apiAvailable = false;
        this.apiBase = '';
    }

    async detectAdminSession() {
        if (this.hasAdminRole()) {
            this.isAdminSession = true;
            return true;
        }

        const bases = this.getApiBaseCandidates();
        for (const base of bases) {
            try {
                const meUrl = base ? `${base}/api/v1/me` : '/api/v1/me';
                const response = await fetch(meUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        ...this.getAuthHeaders(),
                    },
                });

                if (!response.ok) continue;
                const data = await response.json();
                if (data && data.user && data.user.role === 'admin') {
                    this.isAdminSession = true;
                    this.apiBase = base;
                    return true;
                }
            } catch (_error) {
                // Keep trying with next base candidate.
            }
        }

        this.isAdminSession = false;
        return false;
    }

    getMockProducts() {
        return [
            {
                id: 1,
                name: 'Auroral Essence',
                description: 'Luminosity serum with premium northern extracts.',
                detailedDescription: 'Premium serum for nightly skincare routines with hydrating compounds.',
                price: 49.99,
                category: 'skincare',
                image: 'https://img.freepik.com/premium-photo/digital-aurora-essence_1029473-34104.jpg?w=996',
                rating: 4.8,
                reviews: 156,
                stock: 45,
                specs: ['Content: 30ml', 'Type: Premium serum', 'Origin: Nordic ingredients'],
            },
            {
                id: 2,
                name: 'Glacial Shield',
                description: 'Protective day cream with SPF support.',
                detailedDescription: 'Day cream with fast absorption and antioxidant properties.',
                price: 64.99,
                category: 'skincare',
                image: 'https://via.placeholder.com/500x500/1abc9c/ffffff?text=Glacial+Shield',
                rating: 4.9,
                reviews: 203,
                stock: 32,
                specs: ['Content: 50ml', 'SPF: 30', 'Type: Day cream'],
            },
            {
                id: 3,
                name: 'Lunar Glow Mist',
                description: 'Facial mist for hydration and refresh.',
                detailedDescription: 'Portable hydration mist with a calming aroma profile.',
                price: 39.99,
                category: 'skincare',
                image: 'https://via.placeholder.com/500x500/ff9d5c/ffffff?text=Lunar+Glow+Mist',
                rating: 4.7,
                reviews: 89,
                stock: 78,
                specs: ['Content: 100ml', 'Type: Hydration mist', 'Portable format'],
            },
            {
                id: 4,
                name: 'Stellar Oil',
                description: 'Nourishing facial oil for night care.',
                detailedDescription: 'Concentrated facial oil for deep night nourishment.',
                price: 54.99,
                category: 'skincare',
                image: 'https://via.placeholder.com/500x500/6b6560/ffffff?text=Stellar+Oil',
                rating: 4.9,
                reviews: 134,
                stock: 56,
                specs: ['Content: 25ml', 'Type: Facial oil', 'Use: Night routine'],
            },
        ];
    }

    loadProductDetail() {
        this.currentProduct = this.products.find((p) => p.id === this.productId);

        if (!this.currentProduct) {
            document.querySelector('main').innerHTML = `
                <div class="error-message">
                    <h2>Producto no encontrado</h2>
                    <p>Lo sentimos, el producto que buscas no existe.</p>
                    <a href="index.html" class="btn btn--primary">Volver al catalogo</a>
                </div>
            `;
            return;
        }

        document.title = `${this.currentProduct.name} - AuraMarket`;
        document.getElementById('breadcrumb-product').textContent = this.currentProduct.name;
        document.getElementById('main-image').src = this.currentProduct.image;
        document.getElementById('thumb-0').src = this.currentProduct.image;
        document.getElementById('product-name').textContent = this.currentProduct.name;
        document.getElementById('product-price').textContent = `S/. ${Number(this.currentProduct.price || 0).toFixed(2)}`;

        const description = this.currentProduct.detailedDescription || this.currentProduct.description || 'Sin descripcion disponible.';
        document.getElementById('product-description').textContent = description;

        this.renderRating(Number(this.currentProduct.rating || 4.5), Number(this.currentProduct.reviews || 0));
        this.renderStockStatus(Number(this.currentProduct.stock || 0));
        this.renderSpecs(this.currentProduct.specs);
        this.loadRecommendations();
        this.renderAdminEditor();

        console.log(`Product page loaded: ${this.currentProduct.name} (ID:${this.productId})`);
    }

    renderRating(rating, reviews) {
        const ratingEl = document.getElementById('product-rating');
        if (!ratingEl) return;

        const roundedStars = Math.round(Math.max(0, Math.min(5, rating)));
        let starsHTML = '';

        for (let i = 0; i < 5; i++) {
            starsHTML += i < roundedStars ? '<span class="star active">★</span>' : '<span class="star">☆</span>';
        }

        ratingEl.innerHTML = starsHTML;
        document.getElementById('rating-text').textContent = `${rating.toFixed(1)} (${reviews} reseñas)`;
    }

    renderStockStatus(stock) {
        const statusEl = document.getElementById('stock-status');
        const countEl = document.getElementById('stock-count');
        if (!statusEl || !countEl) return;

        statusEl.classList.remove('in-stock', 'low-stock', 'out-of-stock');

        if (stock > 10) {
            statusEl.classList.add('in-stock');
            countEl.textContent = `${stock} unidades disponibles`;
        } else if (stock > 0) {
            statusEl.classList.add('low-stock');
            countEl.textContent = `${stock} unidades (compra pronta recomendada)`;
        } else {
            statusEl.classList.add('out-of-stock');
            countEl.textContent = 'Agotado';
        }
    }

    renderSpecs(specs) {
        const specsEl = document.getElementById('product-specs');
        if (!specsEl) return;

        const normalizedSpecs = Array.isArray(specs) && specs.length > 0
            ? specs
            : [
                `Categoria: ${this.currentProduct.category || 'general'}`,
                `SKU: ${this.currentProduct.sku || 'N/A'}`,
            ];

        specsEl.innerHTML = normalizedSpecs.map((spec) => `<li>${spec}</li>`).join('');
    }

    loadRecommendations() {
        const recommendations = this.products
            .filter((p) => p.category === this.currentProduct.category && p.id !== this.currentProduct.id)
            .slice(0, 3);

        const grid = document.getElementById('recommendations-grid');
        if (!grid) return;

        grid.innerHTML = recommendations
            .map((product) => `
                <a href="product-detail.html?id=${product.id}" class="product-card scroll-reveal" style="text-decoration: none; color: inherit;">
                    <div class="product-image">
                        <img src="${product.image}" alt="${product.name}" loading="lazy">
                    </div>
                    <div class="product-content">
                        <h3 class="product-name">${product.name}</h3>
                        <p class="product-description">${product.description || ''}</p>
                        <div class="product-price">
                            <span class="product-price-current">S/. ${Number(product.price || 0).toFixed(2)}</span>
                        </div>
                        <div class="product-actions">
                            <button class="btn-add-cart" onclick="event.preventDefault(); productDetail.addToCartFromCard(${product.id})">Añadir</button>
                        </div>
                    </div>
                </a>
            `)
            .join('');
    }

    setupEventListeners() {
        const qtyMinus = document.getElementById('qty-minus');
        const qtyPlus = document.getElementById('qty-plus');
        const qtyInput = document.getElementById('quantity');
        const addCartBtn = document.getElementById('btn-add-cart');
        const wishlistBtn = document.getElementById('btn-wishlist');

        if (qtyMinus) qtyMinus.addEventListener('click', () => this.changeQuantity(-1));
        if (qtyPlus) qtyPlus.addEventListener('click', () => this.changeQuantity(1));

        if (qtyInput) {
            qtyInput.addEventListener('change', (event) => {
                this.quantity = Math.max(1, parseInt(event.target.value, 10) || 1);
                qtyInput.value = this.quantity;
            });
        }

        if (addCartBtn) addCartBtn.addEventListener('click', () => this.addToCart());
        if (wishlistBtn) wishlistBtn.addEventListener('click', (event) => this.toggleWishlist(event));
    }

    changeQuantity(change) {
        this.quantity = Math.max(1, this.quantity + change);
        const input = document.getElementById('quantity');
        if (input) input.value = this.quantity;
    }

    addToCart() {
        if (!window.cartManager) {
            console.error('CartManager unavailable');
            return;
        }

        for (let i = 0; i < this.quantity; i++) {
            cartManager.addToCart(this.currentProduct.id);
        }

        const btn = document.getElementById('btn-add-cart');
        if (!btn) return;

        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Añadido al carrito';
        btn.style.background = 'var(--color-success, #2ecc71)';

        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.background = '';
        }, 2000);
    }

    addToCartFromCard(productId) {
        if (!window.cartManager) return;
        cartManager.addToCart(productId);
    }

    toggleWishlist(event) {
        event.preventDefault();
        const btn = event.target.closest('.btn-wishlist');
        if (!btn) return;

        btn.classList.toggle('active');
        btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    }

    
    renderAdminEditor() {
        const editor = document.getElementById('admin-product-editor');
        if (!editor) return;

        this.isAdminSession = this.isAdminSession || this.hasAdminRole();
        if (!this.isAdminSession) {
            editor.hidden = true;
            return;
        }

        editor.hidden = false;
        this.populateAdminEditor();

        const form = document.getElementById('admin-edit-form');
        if (form && !form.dataset.bound) {
            form.addEventListener('submit', (event) => this.handleAdminSave(event));
            form.dataset.bound = 'true';
        }

        if (!this.apiAvailable) {
            this.setAdminStatus('Sin conexion API. Inicia backend (puerto 5000 o 3000) para guardar cambios.', 'error');
        } else {
            this.setAdminStatus('Modo admin activo. Puedes editar y guardar el producto.', 'success');
        }
    }

    populateAdminEditor() {
        const product = this.currentProduct;
        if (!product) return;

        const description = product.detailedDescription || product.description || '';

        document.getElementById('admin-edit-name').value = product.name || '';
        document.getElementById('admin-edit-description').value = description;
        document.getElementById('admin-edit-price').value = Number(product.price || 0);
        document.getElementById('admin-edit-stock').value = Number(product.stock || 0);
        document.getElementById('admin-edit-category').value = product.category || '';
        document.getElementById('admin-edit-image').value = product.image || '';
    }

    buildAdminPayload() {
        const name = document.getElementById('admin-edit-name').value.trim();
        const description = document.getElementById('admin-edit-description').value.trim();
        const price = Number.parseFloat(document.getElementById('admin-edit-price').value);
        const stock = Number.parseInt(document.getElementById('admin-edit-stock').value, 10);
        const category = document.getElementById('admin-edit-category').value.trim();
        const image = document.getElementById('admin-edit-image').value.trim();

        return {
            name,
            description,
            detailedDescription: description,
            price: Number.isFinite(price) ? price : 0,
            stock: Number.isFinite(stock) ? stock : 0,
            category,
            image,
        };
    }

    setAdminStatus(message, type = '') {
        const statusEl = document.getElementById('admin-edit-status');
        if (!statusEl) return;

        statusEl.textContent = message;
        statusEl.className = `admin-edit-status ${type}`.trim();
    }

    async handleAdminSave(event) {
        event.preventDefault();

        if (!this.isAdminSession) {
            this.setAdminStatus('Solo administradores pueden editar productos.', 'error');
            return;
        }

        const payload = this.buildAdminPayload();
        if (!payload.name || !payload.description || !payload.category) {
            this.setAdminStatus('Completa nombre, descripcion y categoria.', 'error');
            return;
        }

        this.setAdminStatus('Guardando cambios...', '');

        try {
            const response = await fetch(this.buildApiUrl(`/api/v1/products/${this.currentProduct.id}`), {
                method: 'PUT',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.getAuthHeaders(),
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || 'No fue posible guardar el producto.');
            }

            const updatedProduct = data.data || {
                ...this.currentProduct,
                ...payload,
            };

            this.products = this.products.map((product) => (
                product.id === this.currentProduct.id ? { ...product, ...updatedProduct } : product
            ));

            this.currentProduct = { ...this.currentProduct, ...updatedProduct };
            this.loadProductDetail();
            this.setAdminStatus('Producto actualizado correctamente.', 'success');
        } catch (error) {
            this.setAdminStatus(error.message || 'Error guardando producto.', 'error');
        }
    }
}

let productDetail;
document.addEventListener('DOMContentLoaded', () => {
    if (window.themeManager && typeof window.themeManager.bindExistingToggles === 'function') {
        window.themeManager.bindExistingToggles();
    }

    productDetail = new ProductDetailManager();
});
