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
        }

        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            document.querySelectorAll('.scroll-reveal').forEach(el => {
                el.style.opacity = '1';
                el.style.transform = 'translate3d(0, 0, 0)';
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
                        entry.target.classList.remove('scroll-reveal--pending');
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translate3d(0, 0, 0)';
                    }
                    // Unobserve after revealing
                    observer.unobserve(entry.target);
                } else if (entry.target.classList.contains('world-reveal')) {
                    // Keep visible content intact when this file is loaded on demand.
                    entry.target.classList.add('world-reveal--pending');
                } else if (entry.target.classList.contains('scroll-reveal')) {
                    entry.target.classList.add('scroll-reveal--pending');
                }
            });
        }, this.observerOptions);

        document.querySelectorAll('.scroll-reveal, .world-reveal').forEach((element) => {
            if (showWithoutMotion) {
                if (element.classList.contains('scroll-reveal')) {
                    element.style.opacity = '1';
                    element.style.transform = 'translate3d(0, 0, 0)';
                }
                return;
            }
            observer.observe(element);
        });
    }

    // Initialize all animations
    init() {
        this.setupLazyVideos();
        this.setupIdleMotion();
    }

    setupLazyVideos() {
        document.addEventListener('click', (event) => {
            if (!(event.target instanceof Element)) return;
            const preview = event.target.closest('[data-lazy-video]');
            if (!preview || !preview.dataset.videoSrc) return;

            const stage = preview.closest('.world-video__stage');
            if (!stage || stage.querySelector('[data-lazy-video-player]')) return;

            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const slowNetwork = Boolean(connection && (
                connection.saveData ||
                /^(slow-2g|2g)$/.test(connection.effectiveType || '') ||
                (Number(connection.downlink) > 0 && Number(connection.downlink) < 1.2)
            ));
            if (slowNetwork) return; // Keep the poster and let the link open Pexels' static page.

            event.preventDefault();

            const video = document.createElement('video');
            video.className = 'world-video__player';
            video.controls = true;
            video.playsInline = true;
            video.preload = 'none';
            video.setAttribute('aria-label', preview.dataset.videoLabel || 'Video ilustrativo');
            video.dataset.lazyVideoPlayer = 'true';

            if (preview.dataset.videoPoster) video.poster = preview.dataset.videoPoster;

            const source = document.createElement('source');
            source.src = preview.dataset.videoSrc;
            source.type = 'video/mp4';
            video.append(source);

            const restorePreview = () => {
                video.remove();
                preview.classList.remove('is-hidden');
                preview.removeAttribute('aria-hidden');
            };

            video.addEventListener('error', restorePreview, { once: true });
            preview.classList.add('is-hidden');
            preview.setAttribute('aria-hidden', 'true');
            stage.append(video);
            video.load();

            const playRequest = video.play();
            if (playRequest && typeof playRequest.catch === 'function') {
                playRequest.catch(() => video.focus());
            }
        });
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

// The entry script is loaded near the first reveal target, which may be after DOMContentLoaded.
function initializeAnimations() {
    const animationManager = new AnimationManager();
    animationManager.init();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations, { once: true });
} else {
    initializeAnimations();
}

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

// Keep the legacy storefront helpers available to classic scripts.
window.debounce = debounce;
window.formatCurrency = formatCurrency;
window.log = log;
