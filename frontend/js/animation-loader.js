/* Load motion behavior only as the first reveal area approaches the viewport. */
(function loadAnimationsOnDemand() {
    var loaderUrl = document.currentScript && document.currentScript.src;
    var animationsModuleUrl = loaderUrl
        ? new URL('./animations.js', loaderUrl).href
        : new URL('js/animations.js', document.baseURI).href;
    var trigger = document.querySelector('[data-motion-script-trigger]') ||
        document.querySelector('.world-reveal, .scroll-reveal');
    var loaded = false;

    function loadAnimations() {
        if (loaded) return;
        loaded = true;
        import(animationsModuleUrl).catch(function () {
            // Content remains visible and the browser keeps native anchor behavior.
        });
    }

    if (!trigger || !('IntersectionObserver' in window)) {
        loadAnimations();
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        loadAnimations();
    }, { rootMargin: '120px 0px' });

    observer.observe(trigger);
})();
