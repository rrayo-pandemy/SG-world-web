/* Load the Three.js scene only after the hero is visible and the first paint has passed. */
(function loadHero3DOnDemand() {
    var hero = document.querySelector('.world-hero');
    var mount = hero && hero.querySelector('[data-hero-3d]');
    if (!hero || !mount || !('IntersectionObserver' in window)) return;

    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var reducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
    var smallViewport = window.matchMedia('(max-width: 800px), (pointer: coarse)').matches;
    var lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    var slowConnection = connection && (
        connection.saveData || /^(slow-2g|2g)$/.test(connection.effectiveType || '')
    );

    if (reducedMotion || reducedData || smallViewport || lowPower || slowConnection) return;

    var loaded = false;
    var scheduled = false;

    function isHeroVisible() {
        var bounds = hero.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < window.innerHeight;
    }

    function waitForHeroImage(callback) {
        var image = hero.querySelector('.world-hero__media img');
        if (!image) {
            callback();
            return;
        }

        function decodeAndContinue() {
            if (typeof image.decode !== 'function') {
                callback();
                return;
            }
            image.decode().catch(function () {}).then(callback);
        }

        if (image.complete) {
            decodeAndContinue();
        } else {
            image.addEventListener('load', decodeAndContinue, { once: true });
            image.addEventListener('error', callback, { once: true });
        }
    }

    function scheduleSceneLoad() {
        if (loaded || scheduled) return;
        scheduled = true;

        waitForHeroImage(function () {
            function loadScene() {
                scheduled = false;
                if (!mount.isConnected) {
                    observer.disconnect();
                    return;
                }
                if (document.hidden || !isHeroVisible()) return;

                loaded = true;
                observer.disconnect();
                import('./hero-3d.bundle.js')
                    .then(function (scene) { scene.mountHero3D(mount); })
                    .catch(function () {
                        // Keep the semantic hero and its existing photo fallback.
                    });
            }

            // Let the browser paint the headline and decode the LCP image before WebGL work.
            requestAnimationFrame(function () {
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(loadScene, { timeout: 1600 });
                } else {
                    window.setTimeout(loadScene, 120);
                }
            });
        });
    }

    var observer = new IntersectionObserver(function (entries) {
        if (loaded || !entries.some(function (entry) { return entry.isIntersecting; })) return;
        scheduleSceneLoad();
    }, { rootMargin: '0px', threshold: 0.05 });

    observer.observe(hero);
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden && !loaded && isHeroVisible()) scheduleSceneLoad();
    });
})();
