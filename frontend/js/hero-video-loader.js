/* Load the silent Hero loop only on capable desktop devices after the poster is ready. */
(function loadHeroVideoOnDemand() {
    var hero = document.querySelector('.world-hero');
    var video = hero && hero.querySelector('[data-hero-background-video]');
    var poster = hero && hero.querySelector('.world-hero__media img');
    if (!hero || !video || !('IntersectionObserver' in window)) return;

    var connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var reducedData = window.matchMedia('(prefers-reduced-data: reduce)');
    var smallOrCoarse = window.matchMedia('(max-width: 800px), (pointer: coarse)');
    var sourceAssigned = false;
    var loadScheduled = false;
    var heroVisible = false;
    var playPending = false;

    function hasSlowConnection() {
        return connection && (connection.saveData || /^(slow-2g|2g|3g)$/.test(connection.effectiveType || ''));
    }

    function canPlayAmbientVideo() {
        var lowPower = (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
            (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
        return !reducedMotion.matches && !reducedData.matches && !smallOrCoarse.matches &&
            !lowPower && !hasSlowConnection() &&
            document.documentElement.getAttribute('data-save-data') !== 'true';
    }

    function isForeground() {
        return heroVisible && !document.hidden && canPlayAmbientVideo();
    }

    function pauseVideo() {
        playPending = false;
        video.pause();
        video.classList.remove('is-playing');
    }

    function playVideo() {
        if (!isForeground() || !sourceAssigned || video.readyState < 2 || playPending || !video.paused) return;
        playPending = true;
        video.play().then(function () {
            playPending = false;
            if (isForeground()) video.classList.add('is-playing');
            else pauseVideo();
        }).catch(function () {
            playPending = false;
            video.classList.remove('is-playing');
            // The eager image remains visible if autoplay is unavailable.
        });
    }

    function assignVideoSource() {
        loadScheduled = false;
        if (!isForeground() || sourceAssigned) {
            if (sourceAssigned && isForeground()) playVideo();
            return;
        }

        sourceAssigned = true;
        video.addEventListener('canplay', playVideo, { once: true });
        video.src = video.dataset.src;
        video.load();
        playVideo();
    }

    function afterPosterReady(callback) {
        if (!poster || poster.complete) {
            if (poster && typeof poster.decode === 'function') poster.decode().catch(function () {}).then(callback);
            else callback();
            return;
        }
        poster.addEventListener('load', function () {
            if (typeof poster.decode === 'function') poster.decode().catch(function () {}).then(callback);
            else callback();
        }, { once: true });
        poster.addEventListener('error', callback, { once: true });
    }

    function scheduleVideoLoad() {
        if (loadScheduled || sourceAssigned || !isForeground()) return;
        loadScheduled = true;
        afterPosterReady(function () {
            window.requestAnimationFrame(function () {
                var loadWhenIdle = function () {
                    if (isForeground()) assignVideoSource();
                    else loadScheduled = false;
                };
                if ('requestIdleCallback' in window) {
                    window.requestIdleCallback(loadWhenIdle, { timeout: 5200 });
                } else {
                    window.setTimeout(loadWhenIdle, 700);
                }
            });
        });
    }

    var observer = new IntersectionObserver(function (entries) {
        var entry = entries[0];
        heroVisible = Boolean(entry && entry.isIntersecting);
        if (!heroVisible || !canPlayAmbientVideo()) {
            pauseVideo();
            return;
        }
        if (sourceAssigned) playVideo();
        else scheduleVideoLoad();
    }, { threshold: 0.01 });

    function refreshPlayback() {
        if (!isForeground()) {
            pauseVideo();
            return;
        }
        if (sourceAssigned) playVideo();
        else scheduleVideoLoad();
    }

    [reducedMotion, reducedData, smallOrCoarse].forEach(function (query) {
        if (query.addEventListener) query.addEventListener('change', refreshPlayback);
        else if (query.addListener) query.addListener(refreshPlayback);
    });

    if (connection && connection.addEventListener) connection.addEventListener('change', refreshPlayback);
    document.addEventListener('visibilitychange', refreshPlayback);
    observer.observe(hero);
})();
