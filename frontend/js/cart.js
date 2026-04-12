/* ============================================
   SHOPPING CART MANAGEMENT
   ============================================ */

class ShoppingCart {
    constructor() {
        this.storageKey = 'aurora_cart';
        this.cart = this.loadCart();
        this.cartToggle = document.querySelector('.cart-toggle');
        this.cartSidebar = document.querySelector('.cart-sidebar');
        this.cartOverlay = document.querySelector('.cart-overlay');
        this.cartBadge = document.querySelector('.cart-badge');
        this.cartItemsContainer = document.querySelector('.cart-items');
        this.cartCloseBtn = document.querySelector('.cart-close');
        this.init();
    }

    // Initialize cart functionality
    init() {
        this.setupEventListeners();
        this.updateCartUI();
        log('Carrito inicializado');
    }

    setupEventListeners() {
        // Toggle cart sidebar
        if (this.cartToggle) {
            this.cartToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Close cart
        if (this.cartCloseBtn) {
            this.cartCloseBtn.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        if (this.cartOverlay) {
            this.cartOverlay.addEventListener('click', () => {
                this.closeSidebar();
            });
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeSidebar();
            }
        });
    }

    // Load cart from localStorage
    loadCart() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    }

    // Save cart to localStorage
    saveCart() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
        } catch (error) {
            console.error('Error saving cart:', error);
        }
    }

    // Add item to cart
    addToCart(productId) {
        // Get product data from main products list
        const product = productManager.products.find(p => p.id === productId);
        
        if (!product) {
            log('Producto no encontrado', 'error');
            return;
        }

        // Check if it's a premium product and user is not premium logged in
        if (product.isPremium) {
            const isPremiumUser = localStorage.getItem('premiumLogged') === 'true';
            if (!isPremiumUser) {
                log('Acceso denegado: Solo usuarios Premium pueden comprar este producto', 'error');
                this.showPremiumModal(product);
                return;
            }
        }

        // Check if item already in cart
        const existingItem = this.cart.find(item => item.id === productId);

        if (existingItem) {
            existingItem.quantity++;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image,
                isPremium: product.isPremium
            });
        }

        this.saveCart();
        this.updateCartUI();
        this.showNotification(`${product.name} añadido al carrito`);
        log(`Producto ${product.name} añadido al carrito`);
    }

    // Remove item from cart
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartUI();
        log('Producto removido del carrito');
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        const item = this.cart.find(item => item.id === productId);
        
        if (item) {
            if (quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                item.quantity = quantity;
                this.saveCart();
                this.updateCartUI();
                log(`Cantidad actualizada a ${quantity}`);
            }
        }
    }

    // Get complete cart
    getCart() {
        return this.cart;
    }

    // Clear entire cart
    clearCart() {
        this.cart = [];
        this.saveCart();
        this.updateCartUI();
        log('Carrito vaciado');
    }

    // Calculate subtotal
    calculateSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Calculate total (with shipping)
    calculateTotal() {
        const subtotal = this.calculateSubtotal();
        const shipping = subtotal > 200 ? 0 : 10; // Free shipping over S/. 200
        return subtotal + shipping;
    }

    // Update UI
    updateCartUI() {
        this.updateBadge();
        this.renderCartItems();
        this.updateCartSummary();
    }

    // Update badge with item count
    updateBadge() {
        if (!this.cartBadge) return;
        
        const count = this.cart.reduce((total, item) => total + item.quantity, 0);
        this.cartBadge.textContent = count;
        
        if (count > 0) {
            this.cartBadge.style.display = 'flex';
        } else {
            this.cartBadge.style.display = 'none';
        }
    }

    // Render cart items
    renderCartItems() {
        if (!this.cartItemsContainer) return;

        if (this.cart.length === 0) {
            this.cartItemsContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: var(--color-text-light);">
                    <p style="font-size: 3rem; margin-bottom: 1rem;">🛒</p>
                    <p>Tu carrito está vacío</p>
                    <p style="font-size: 0.875rem;">Agrega productos para comenzar</p>
                </div>
            `;
            return;
        }

        this.cartItemsContainer.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image" style="background: url('${item.image}') center/cover;"></div>
                <div class="cart-item-detail">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${formatCurrency(item.price)}</div>
                    <div class="cart-item-actions">
                        <div class="qty-control">
                            <button onclick="cartManager.updateQuantity(${item.id}, ${item.quantity - 1})">−</button>
                            <input type="number" value="${item.quantity}" readonly>
                            <button onclick="cartManager.updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                        </div>
                        <button 
                            onclick="cartManager.removeFromCart(${item.id})"
                            style="background: none; color: var(--color-text-light); font-size: 1.2rem; cursor: pointer;"
                            title="Eliminar"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Update cart summary
    updateCartSummary() {
        const subtotal = this.calculateSubtotal();
        const shipping = subtotal > 200 ? 0 : (subtotal === 0 ? 0 : 10);
        const total = subtotal + shipping;

        const subtotalEl = document.querySelector('.subtotal');
        const shippingEl = document.querySelector('.shipping');
        const totalEl = document.querySelector('.total-price');

        if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
        if (shippingEl) {
            if (shipping === 0 && subtotal > 0) {
                shippingEl.innerHTML = '<span style="color: var(--color-success);">¡GRATIS!</span>';
            } else {
                shippingEl.textContent = formatCurrency(shipping);
            }
        }
        if (totalEl) totalEl.textContent = formatCurrency(total);
    }

    // Toggle sidebar visibility
    toggleSidebar() {
        if (this.cartSidebar && this.cartSidebar.classList.contains('open')) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    // Open sidebar
    openSidebar() {
        if (this.cartSidebar) this.cartSidebar.classList.add('open');
        if (this.cartOverlay) this.cartOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    // Close sidebar
    closeSidebar() {
        if (this.cartSidebar) this.cartSidebar.classList.remove('open');
        if (this.cartOverlay) this.cartOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    // Show notification (simple toast)
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--color-success);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: var(--shadow-lg);
            z-index: 2000;
            animation: slideInUp 0.3s ease-out;
            max-width: 400px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease-in';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Show Premium modal when user tries to buy premium product without premium access
    showPremiumModal(product) {
        const modal = document.getElementById('premium-upgrade-modal');
        if (!modal) return;

        const productName = modal.querySelector('.premium-modal-product-name');
        const upgradeBtn = modal.querySelector('[data-action="upgrade-premium"]');
        const closeBtn = modal.querySelector('.modal__close');
        const closeActionBtn = modal.querySelector('[data-modal-close]');
        const overlay = modal.querySelector('.modal__overlay');

        const closeModal = () => {
            modal.classList.remove('open');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        };

        if (productName) {
            productName.textContent = product.name;
        }

        // Open modal
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Close button handler
        if (closeBtn) {
            closeBtn.onclick = closeModal;
        }

        // Secondary close button handler (data-modal-close)
        if (closeActionBtn) {
            closeActionBtn.onclick = closeModal;
        }

        // Upgrade button handler - opens premium login
        if (upgradeBtn) {
            upgradeBtn.onclick = () => {
                closeModal();
                // Trigger premium login modal
                const premiumLoginBtn = document.querySelector('.premium-login');
                if (premiumLoginBtn) {
                    premiumLoginBtn.click();
                }
            };
        }

        // Close on overlay click
        if (overlay) {
            overlay.onclick = closeModal;
        }
    }
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideOutDown {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(20px);
        }
    }
`;
document.head.appendChild(style);

/* ============================================
   GLOBAL CART INSTANCE
   ============================================ */

let cartManager;

document.addEventListener('DOMContentLoaded', () => {
    cartManager = new ShoppingCart();
});
