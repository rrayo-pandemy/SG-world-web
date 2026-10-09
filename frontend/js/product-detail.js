/**
 * Product detail page behavior.
 * Keeps catalog, account, cart and review integrations attached to the shared app.
 */

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

class ProductDetailManager {
    constructor() {
        this.productId = this.getProductIdFromURL();
        this.products = [];
        this.currentProduct = null;
        this.reviews = [];
        this.reviewsLoadFailed = false;
        this.quantity = 1;
        this.apiBase = '';
        this.apiAvailable = false;
        this.isAdminSession = this.getCurrentUserRole() === 'admin';
        this.isUserAuthenticated = this.isAuthenticated();
        this.init();
    }

    getProductIdFromURL() {
        const value = new URLSearchParams(window.location.search).get('id');
        if (!value || !/^[1-9]\d*$/.test(value)) return null;

        const productId = Number(value);
        return Number.isSafeInteger(productId) ? productId : null;
    }

    getApiBaseCandidates() {
        if (window.ApiConfig && typeof window.ApiConfig.getBaseCandidates === 'function') {
            return window.ApiConfig.getBaseCandidates();
        }
        return ['', 'http://localhost:5000', 'http://localhost:3000'];
    }

    buildApiUrl(path) {
        if (/^https?:\/\//i.test(path)) return path;
        return this.apiBase ? this.apiBase + path : path;
    }

    getCurrentUserRole() {
        if (!window.sessionManager || typeof window.sessionManager.getCurrentUser !== 'function') return '';
        return window.sessionManager.getCurrentUser()?.role || '';
    }

    isAuthenticated() {
        return Boolean(
            window.sessionManager
            && typeof window.sessionManager.isAuthenticated === 'function'
            && window.sessionManager.isAuthenticated()
        );
    }

    async init() {
        if (!this.productId) {
            this.renderPageMessage(
                'No encontramos esta ficha',
                'El enlace no contiene un identificador de producto válido.'
            );
            return;
        }

        await this.loadProducts();
        await this.detectAdminSession();

        if (this.loadProductDetail()) {
            await this.loadReviews();
        }

        this.setupEventListeners();
        this.setupReviewForm();
    }

    async loadProducts() {
        const bases = this.getApiBaseCandidates();

        for (const base of bases) {
            try {
                this.apiBase = base;
                const response = await fetch(this.buildApiUrl('/api/v1/products'), {
                    credentials: 'include',
                });
                if (!response.ok) throw new Error('No se pudo cargar el catálogo.');

                const data = await response.json();
                const products = data.data ?? data;
                if (!Array.isArray(products)) throw new Error('La respuesta del catálogo no es válida.');

                this.products = products;
                this.apiAvailable = true;
                return;
            } catch (_error) {
                this.apiAvailable = false;
            }
        }

        this.products = this.getCachedProducts();
        this.apiAvailable = false;
        this.apiBase = '';
    }

    async detectAdminSession() {
        if (this.isAuthenticated() && this.getCurrentUserRole() === 'admin') {
            this.isAdminSession = true;
            return true;
        }

        for (const base of this.getApiBaseCandidates()) {
            try {
                const url = base ? base + '/api/v1/me' : '/api/v1/me';
                const response = await fetch(url, {
                    method: 'GET',
                    credentials: 'include',
                });

                if (!response.ok) continue;
                const data = await response.json();
                if (data?.user?.role === 'admin') {
                    this.isAdminSession = true;
                    this.apiBase = base;
                    return true;
                }
            } catch (_error) {
                // Keep checking configured API origins.
            }
        }

        this.isAdminSession = false;
        return false;
    }

    getCachedProducts() {
        try {
            const cached = JSON.parse(localStorage.getItem('ElRinconAzul_products_cache') || 'null');
            return Array.isArray(cached) ? cached : [];
        } catch (_error) {
            return [];
        }
    }

    renderPageMessage(title, message, canRetry = false) {
        const main = document.querySelector('main');
        if (!main) return;

        const action = canRetry
            ? '<button type="button" data-retry-catalog>Volver a intentar</button>'
            : '<a href="index.html#productos">Volver al catálogo</a>';

        main.innerHTML = '<section class="product-detail-state" aria-labelledby="product-state-title">'
            + '<div class="product-detail-state__content">'
            + '<h1 id="product-state-title">' + escapeHtml(title) + '</h1>'
            + '<p>' + escapeHtml(message) + '</p>'
            + action
            + '</div></section>';
    }

    loadProductDetail() {
        this.currentProduct = this.products.find(
            (product) => String(product.id) === String(this.productId)
        );

        if (!this.currentProduct) {
            if (!this.apiAvailable && this.products.length === 0) {
                this.renderPageMessage(
                    'El catálogo no está disponible',
                    'No pudimos cargar la información ahora. Intenta nuevamente en unos momentos.',
                    true
                );
            } else {
                this.renderPageMessage(
                    'Producto no disponible',
                    'El artículo solicitado ya no está en el catálogo o el enlace puede haber cambiado.'
                );
            }
            return false;
        }

        const product = this.currentProduct;
        const productName = String(product.name || 'Producto');
        document.title = productName + ' | Empresa de Servicios Generales';
        document.getElementById('breadcrumb-product').textContent = productName;

        const imageFrame = document.querySelector('.product-detail__main-image');
        const imageUrl = String(product.image || '').trim();
        if (imageFrame && imageUrl) {
            const mainImage = document.createElement('img');
            mainImage.id = 'main-image';
            mainImage.src = imageUrl;
            mainImage.alt = productName;
            mainImage.loading = 'eager';
            mainImage.fetchPriority = 'high';
            mainImage.decoding = 'async';
            imageFrame.replaceChildren(mainImage);
        } else {
            const imagePlaceholder = document.getElementById('main-image-placeholder');
            if (imagePlaceholder) imagePlaceholder.textContent = 'Imagen del producto no disponible.';
        }

        document.getElementById('product-name').textContent = productName;

        const price = Number(product.price);
        document.getElementById('product-price').textContent =
            'S/ ' + (Number.isFinite(price) ? price.toFixed(2) : '0.00');

        const description = product.detailedDescription || product.description || 'Descripción no disponible.';
        document.getElementById('product-description').textContent = description;

        const wishlistButton = document.getElementById('btn-wishlist');
        if (wishlistButton) {
            wishlistButton.dataset.wishlist = String(product.id);
            window.setTimeout(() => {
                document.dispatchEvent(new CustomEvent('ElRinconAzul:session-changed'));
            }, 100);
        }

        this.renderRating(0, 0);
        this.renderStockStatus(product.stock);
        this.renderSpecs(product.specs);
        this.loadRecommendations();
        return true;
    }

    async loadReviews() {
        try {
            const response = await fetch(this.buildApiUrl('/api/v1/reviews/' + this.productId), {
                credentials: 'include',
            });
            if (!response.ok) throw new Error('No se pudieron cargar las opiniones.');

            const data = await response.json();
            this.reviews = Array.isArray(data.data) ? data.data : [];
            this.reviewsLoadFailed = false;
        } catch (error) {
            this.reviews = [];
            this.reviewsLoadFailed = true;
            console.error('Error loading product reviews:', error);
        }

        this.renderReviews();
        this.updateRatingSummary();
    }

    renderReviews() {
        const list = document.getElementById('reviews-list');
        if (!list) return;

        if (this.reviewsLoadFailed) {
            list.innerHTML = '<p class="no-reviews">Las opiniones no están disponibles por ahora. Puedes volver a intentarlo más tarde.</p>';
            return;
        }

        if (this.reviews.length === 0) {
            list.innerHTML = '<p class="no-reviews">Aún no hay opiniones para este producto. Sé el primero en calificarlo.</p>';
            return;
        }

        const dateFormatter = new Intl.DateTimeFormat('es-PE', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });

        list.innerHTML = [...this.reviews]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((review) => {
                const date = new Date(review.date);
                const reviewDate = Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
                const reviewId = escapeHtml(review.id);
                const dateTime = reviewDate ? ' datetime="' + escapeHtml(date.toISOString()) + '"' : '';

                return '<article class="review-item" id="review-' + reviewId + '">'
                    + '<div class="review-meta"><div class="review-author">'
                    + '<span class="review-user">' + escapeHtml(review.userName || 'Usuario') + '</span>'
                    + (review.userRole === 'admin' ? '<span class="admin-badge">Moderador</span>' : '')
                    + '</div><time class="review-date"' + dateTime + '>' + escapeHtml(reviewDate) + '</time></div>'
                    + '<div class="review-stars stars" role="img" aria-label="' + escapeHtml(review.rating) + ' de 5 estrellas">'
                    + this.generateStarsHTML(review.rating) + '</div>'
                    + '<p class="review-comment">' + escapeHtml(review.comment || '') + '</p>'
                    + (this.isAdminSession
                        ? '<div class="admin-review-actions"><button class="btn-delete-review" type="button" data-delete-review="' + reviewId + '">Eliminar opinión</button></div>'
                        : '')
                    + '</article>';
            })
            .join('');
    }

    generateStarsHTML(rating, total = 5) {
        const value = Math.max(0, Math.min(total, Number(rating) || 0));
        return Array.from({ length: total }, (_, index) => (
            index + 1 <= Math.round(value)
                ? '<span class="star active" aria-hidden="true">★</span>'
                : '<span class="star" aria-hidden="true">☆</span>'
        )).join('');
    }

    updateRatingSummary() {
        const avgStars = document.getElementById('avg-rating-stars');
        const avgValue = document.getElementById('avg-rating-value');
        const totalCount = document.getElementById('total-reviews-count');
        const productStars = document.getElementById('product-rating');
        const productText = document.getElementById('rating-text');

        const ratings = this.reviews
            .map((review) => Number(review.rating))
            .filter((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 5);

        if (ratings.length === 0) {
            const label = this.reviewsLoadFailed ? 'Opiniones no disponibles' : 'Sin reseñas';
            if (avgStars) {
                avgStars.innerHTML = this.generateStarsHTML(0);
                avgStars.setAttribute('aria-label', label);
            }
            if (avgValue) avgValue.textContent = '—';
            if (totalCount) {
                totalCount.textContent = this.reviewsLoadFailed
                    ? '(no disponibles)'
                    : '(0 opiniones)';
            }
            if (productStars) {
                productStars.innerHTML = this.generateStarsHTML(0);
                productStars.setAttribute('aria-label', label);
            }
            if (productText) productText.textContent = label;
            return;
        }

        const average = ratings.reduce((total, rating) => total + rating, 0) / ratings.length;
        const stars = this.generateStarsHTML(average);
        const label = average.toFixed(1) + ' de 5, ' + ratings.length + ' opiniones';
        const reviewLabel = ratings.length === 1 ? 'opinión' : 'opiniones';

        if (avgStars) {
            avgStars.innerHTML = stars;
            avgStars.setAttribute('aria-label', label);
        }
        if (avgValue) avgValue.textContent = average.toFixed(1);
        if (totalCount) totalCount.textContent = '(' + ratings.length + ' ' + reviewLabel + ')';
        if (productStars) {
            productStars.innerHTML = stars;
            productStars.setAttribute('aria-label', label);
        }
        if (productText) productText.textContent = average.toFixed(1) + ' (' + ratings.length + ' ' + reviewLabel + ')';
    }

    setupReviewForm() {
        const authenticated = this.isAuthenticated();
        const authContainer = document.getElementById('review-form-auth');
        const guestContainer = document.getElementById('review-form-guest');
        const form = document.getElementById('review-form');

        this.isUserAuthenticated = authenticated;
        if (authContainer) authContainer.hidden = !authenticated;
        if (guestContainer) guestContainer.hidden = authenticated;

        if (form && !form.dataset.bound) {
            form.addEventListener('submit', (event) => this.handleReviewSubmit(event));
            form.dataset.bound = 'true';
        }
    }

    async handleReviewSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const rating = Number(form.querySelector('input[name="rating"]:checked')?.value || 0);
        const comment = document.getElementById('review-comment')?.value.trim() || '';

        if (!rating || !comment) {
            this.setReviewStatus('Selecciona una calificación y escribe tu opinión.', 'error');
            return;
        }

        this.setReviewStatus('Publicando opinión…');

        try {
            const response = await fetch(this.buildApiUrl('/api/v1/reviews'), {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: this.productId,
                    rating: rating,
                    comment: comment,
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'No se pudo publicar la opinión.');

            if (data.data) this.reviews.push(data.data);
            this.reviewsLoadFailed = false;
            this.renderReviews();
            this.updateRatingSummary();
            form.reset();
            this.setReviewStatus('Gracias por compartir tu opinión.', 'success');
        } catch (error) {
            this.setReviewStatus(error.message || 'No se pudo publicar la opinión.', 'error');
        }
    }

    async deleteReview(reviewId) {
        if (!this.isAdminSession || !window.confirm('¿Eliminar esta opinión?')) return;

        try {
            const response = await fetch(
                this.buildApiUrl('/api/v1/reviews/' + encodeURIComponent(reviewId)),
                {
                    method: 'DELETE',
                    credentials: 'include',
                }
            );

            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.message || 'No se pudo eliminar la opinión.');

            this.reviews = this.reviews.filter((review) => String(review.id) !== String(reviewId));
            this.renderReviews();
            this.updateRatingSummary();
        } catch (error) {
            window.alert(error.message || 'No se pudo eliminar la opinión.');
        }
    }

    setReviewStatus(message, type = '') {
        const status = document.getElementById('review-form-status');
        if (!status) return;
        status.textContent = message;
        status.className = 'form-status ' + type;
    }

    renderRating(rating, reviewCount) {
        const stars = document.getElementById('product-rating');
        const text = document.getElementById('rating-text');
        if (!stars || !text) return;

        stars.innerHTML = this.generateStarsHTML(rating);
        stars.setAttribute('aria-label', reviewCount > 0 ? rating.toFixed(1) + ' de 5' : 'Sin reseñas');
        text.textContent = reviewCount > 0
            ? rating.toFixed(1) + ' (' + reviewCount + ' opiniones)'
            : 'Sin reseñas';
    }

    renderStockStatus(stockValue) {
        const status = document.getElementById('stock-status');
        const count = document.getElementById('stock-count');
        const addButton = document.getElementById('btn-add-cart');
        if (!status || !count) return;

        const stock = Number(stockValue);
        const stockIsKnown = Number.isFinite(stock);
        const available = stockIsKnown ? Math.max(0, Math.floor(stock)) : 0;
        status.classList.remove('in-stock', 'low-stock', 'out-of-stock');

        if (!stockIsKnown) {
            status.classList.add('out-of-stock');
            count.textContent = 'Disponibilidad no confirmada';
        } else if (available > 10) {
            status.classList.add('in-stock');
            count.textContent = 'Disponible · ' + available + ' unidades';
        } else if (available > 0) {
            status.classList.add('low-stock');
            count.textContent = 'Disponible · quedan ' + available;
        } else {
            status.classList.add('out-of-stock');
            count.textContent = 'Agotado';
        }

        const quantityInput = document.getElementById('quantity');
        if (quantityInput) quantityInput.max = String(Math.max(available, 1));
        if (addButton) addButton.disabled = !stockIsKnown || available === 0;
        this.setQuantity(available > 0 ? Math.min(this.quantity, available) : 1);
    }

    renderSpecs(specs) {
        const list = document.getElementById('product-specs');
        if (!list) return;

        const product = this.currentProduct;
        const normalized = Array.isArray(specs) && specs.length > 0
            ? specs
            : [
                'Categoría: ' + (product.category || 'General'),
                ...(product.sku ? ['Código: ' + product.sku] : []),
            ];

        list.innerHTML = normalized
            .map((spec) => '<li>' + escapeHtml(spec) + '</li>')
            .join('');
    }

    loadRecommendations() {
        const grid = document.getElementById('recommendations-grid');
        if (!grid) return;

        const recommendations = this.products
            .filter((product) => (
                String(product.id) !== String(this.currentProduct.id)
                && product.category === this.currentProduct.category
            ))
            .slice(0, 3);

        if (recommendations.length === 0) {
            grid.innerHTML = '<p class="no-reviews">No hay otros artículos de esta categoría para mostrar.</p>';
            return;
        }

        grid.innerHTML = recommendations.map((product) => {
            const productId = String(product.id);
            const productName = String(product.name || 'Producto');
            const price = Number(product.price);
            const imageMarkup = product.image
                ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(productName) + '" loading="lazy" decoding="async">'
                : '<span class="recommendation-card__placeholder">Imagen no disponible</span>';
            return '<article class="recommendation-card">'
                + '<a class="recommendation-card__link" href="product-detail.html?id=' + encodeURIComponent(productId) + '">'
                + '<div class="recommendation-card__image">' + imageMarkup + '</div>'
                + '<div class="recommendation-card__body"><h3>' + escapeHtml(productName) + '</h3>'
                + '<p>' + escapeHtml(product.description || '') + '</p>'
                + '<span class="recommendation-card__price">S/ ' + (Number.isFinite(price) ? price.toFixed(2) : '0.00') + '</span></div></a>'
                + '<button class="recommendation-card__action" type="button" data-cart-product="' + escapeHtml(productId) + '">Añadir al carrito →</button>'
                + '</article>';
        }).join('');
    }

    setupEventListeners() {
        const minusButton = document.getElementById('qty-minus');
        const plusButton = document.getElementById('qty-plus');
        const quantityInput = document.getElementById('quantity');
        const addButton = document.getElementById('btn-add-cart');
        const main = document.querySelector('main');
        const reviewsList = document.getElementById('reviews-list');
        const recommendations = document.getElementById('recommendations-grid');

        minusButton?.addEventListener('click', () => this.changeQuantity(-1));
        plusButton?.addEventListener('click', () => this.changeQuantity(1));
        quantityInput?.addEventListener('change', () => {
            this.setQuantity(Number.parseInt(quantityInput.value, 10) || 1);
        });
        addButton?.addEventListener('click', () => this.addToCart());

        main?.addEventListener('click', (event) => {
            if (event.target.closest('[data-retry-catalog]')) window.location.reload();
        });

        reviewsList?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-delete-review]');
            if (button) this.deleteReview(button.dataset.deleteReview);
        });

        recommendations?.addEventListener('click', (event) => {
            const button = event.target.closest('[data-cart-product]');
            if (button) this.addToCartFromCard(button.dataset.cartProduct);
        });

        document.addEventListener('ElRinconAzul:session-changed', () => {
            this.isAdminSession = this.getCurrentUserRole() === 'admin';
            this.setupReviewForm();
            this.renderReviews();
        });
    }

    setQuantity(value) {
        const quantityInput = document.getElementById('quantity');
        const stock = Number(this.currentProduct?.stock);
        const stockIsKnown = Number.isFinite(stock);
        const max = stockIsKnown ? Math.max(1, Math.min(99, Math.floor(stock))) : 1;
        this.quantity = Math.max(1, Math.min(max, Math.floor(Number(value) || 1)));

        if (quantityInput) {
            quantityInput.max = String(max);
            quantityInput.value = String(this.quantity);
        }

        const minusButton = document.getElementById('qty-minus');
        const plusButton = document.getElementById('qty-plus');
        const outOfStock = !stockIsKnown || stock < 1;
        if (minusButton) minusButton.disabled = outOfStock || this.quantity <= 1;
        if (plusButton) plusButton.disabled = outOfStock || this.quantity >= max;
    }

    changeQuantity(delta) {
        this.setQuantity(this.quantity + delta);
    }

    addToCart() {
        const manager = window.cartManager;
        if (!manager || !this.currentProduct) {
            this.setCartStatus('No pudimos conectar con el carrito. Actualiza la página e inténtalo de nuevo.');
            return false;
        }

        const quantityInput = document.getElementById('quantity');
        if (quantityInput) this.setQuantity(Number.parseInt(quantityInput.value, 10) || 1);

        const stock = Number(this.currentProduct.stock);
        if (!Number.isFinite(stock) || stock < 1 || this.quantity > stock) {
            this.setCartStatus('No hay unidades suficientes disponibles para esta cantidad.');
            return false;
        }

        for (let index = 0; index < this.quantity; index += 1) {
            manager.addToCart(this.currentProduct.id);
        }

        this.setCartStatus(this.quantity + (this.quantity === 1
            ? ' unidad agregada al carrito.'
            : ' unidades agregadas al carrito.'));

        const button = document.getElementById('btn-add-cart');
        if (button) {
            button.textContent = 'Agregado al carrito';
            window.setTimeout(() => {
                if (button.isConnected && !button.disabled) {
                    button.innerHTML = 'Añadir al carrito <span class="btn__arrow" aria-hidden="true">→</span>';
                }
            }, 1800);
        }
        return true;
    }

    addToCartFromCard(productId) {
        const product = this.products.find((item) => String(item.id) === String(productId));
        if (!product || !window.cartManager) return;
        window.cartManager.addToCart(product.id);
    }

    setCartStatus(message) {
        const status = document.getElementById('cart-action-status');
        if (status) status.textContent = message;
    }
}

let productDetail;

document.addEventListener('DOMContentLoaded', () => {
    if (window.themeManager && typeof window.themeManager.bindExistingToggles === 'function') {
        window.themeManager.bindExistingToggles();
    }

    productDetail = new ProductDetailManager();
    window.productDetail = productDetail;
});
