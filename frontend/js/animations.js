/* ============================================
   SCROLL REVEAL & ANIMATIONS
   ============================================ */

class AnimationManager {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        this.saveData = Boolean(connection && (connection.saveData || /^(slow-2g|2g)$/.test(connection.effectiveType || '')));
        if (this.saveData) document.documentElement.setAttribute('data-save-data', 'true');
        this.setupIntersectionObserver();
    }

    setupIntersectionObserver() {
        const worldElements = document.querySelectorAll('.world-reveal');
        const showWithoutMotion = this.motionPreference.matches || this.saveData;

        if (showWithoutMotion) {
            worldElements.forEach((element) => element.classList.add('is-revealed'));
        } else if ('IntersectionObserver' in window) {
            worldElements.forEach((element) => element.classList.add('world-reveal--pending'));
        }

        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            document.querySelectorAll('.scroll-reveal').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            });
            worldElements.forEach((element) => {
                element.classList.remove('world-reveal--pending');
                element.classList.add('is-revealed');
            });
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    if (entry.target.classList.contains('world-reveal')) {
                        entry.target.classList.remove('world-reveal--pending');
                        entry.target.classList.add('is-revealed');
                    } else {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                    // Unobserve after revealing
                    observer.unobserve(entry.target);
                }
            });
        }, this.observerOptions);

        document.querySelectorAll('.scroll-reveal, .world-reveal').forEach((element) => {
            if (showWithoutMotion) {
                if (element.classList.contains('scroll-reveal')) {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }
                return;
            }
            observer.observe(element);
        });
    }

    // Initialize all animations
    init() {
        this.setupIdleMotion();
    }

    setupIdleMotion() {
        const loops = document.querySelectorAll('[data-idle-motion]');
        if (!loops.length || this.motionPreference.matches || this.saveData) return;
        if (!('IntersectionObserver' in window)) return;

        const syncVisibility = () => {
            document.documentElement.dataset.pageHidden = document.hidden ? 'true' : 'false';
        };
        syncVisibility();
        document.addEventListener('visibilitychange', syncVisibility);

        const loopObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                entry.target.classList.toggle('is-motion-active', entry.isIntersecting);
            });
        }, { threshold: 0.01, rootMargin: '80px 0px' });

        loops.forEach((element) => loopObserver.observe(element));
    }
}

// Initialize animations when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const animationManager = new AnimationManager();
    animationManager.init();
});

/* ============================================
   SMOOTH SCROLL BEHAVIOR
   ============================================ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        
        if (target) {
            target.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                block: 'start'
            });
            
            // Close mobile menu if open
            const menuToggle = document.querySelector('.menu-toggle');
            const nav = document.querySelector('.nav');
            if (menuToggle && menuToggle.classList.contains('open')) {
                menuToggle.classList.remove('open');
                nav.classList.remove('open');
            }
        }
    });
});

/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

// Log with timestamp
function log(message, type = 'info') {
    console.log(`[${new Date().toLocaleTimeString()}] ${type.toUpperCase()}: ${message}`);
}
