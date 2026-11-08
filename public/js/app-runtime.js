// Shared build state, service worker registration, and visual viewport setup.
(() => {
    const buildId = document.querySelector(
        'meta[name="meditord-build-id"]',
    )?.content;
    if (!buildId) return;

    try {
        const key = "meditord_app_state";
        const previous = JSON.parse(
            localStorage.getItem(key) || "{}",
        );
        if (previous.buildId !== buildId) {
            localStorage.setItem(
                key,
                JSON.stringify({ buildId }),
            );
        }
    } catch {}
})();

(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) {
        return;
    }

    const buildId = document.querySelector(
        'meta[name="meditord-build-id"]',
    )?.content;
    if (!buildId) return;

    // Register before window.load, which can wait on large post images.
    const scriptUrl = `/sw.js?v=${encodeURIComponent(buildId)}`;
    window.meditordServiceWorkerReady = navigator.serviceWorker
        .register(scriptUrl, { scope: "/", updateViaCache: "none" })
        .then(async registration => {
            if (!registration.active?.scriptURL.endsWith(scriptUrl)) {
                const installing = registration.installing || registration.waiting;
                if (installing) {
                    await Promise.race([
                        new Promise(resolve => {
                            if (installing.state === "activated") return resolve();
                            installing.addEventListener("statechange", () => {
                                if (installing.state === "activated" || installing.state === "redundant") resolve();
                            });
                        }),
                        new Promise(resolve => window.setTimeout(resolve, 2800)),
                    ]);
                }
            }
            return registration;
        })
        .catch(() => null);
})();

(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    let frame = 0;
    const syncViewport = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            const activeElement = document.activeElement;
            const textInputFocused =
                activeElement instanceof HTMLTextAreaElement ||
                activeElement?.isContentEditable ||
                (activeElement instanceof HTMLInputElement &&
                    ![
                        "button",
                        "checkbox",
                        "file",
                        "radio",
                        "range",
                        "reset",
                        "submit",
                    ].includes(activeElement.type));
            const rawOffset = Math.max(
                0,
                window.innerHeight -
                    (viewport.height + viewport.offsetTop),
            );
            const keyboardOffset =
                textInputFocused && viewport.scale === 1
                    ? rawOffset
                    : 0;
            const root = document.documentElement;
            root.style.setProperty(
                "--keyboard-offset",
                `${keyboardOffset}px`,
            );
            root.style.setProperty(
                "--visual-viewport-height",
                `${viewport.height}px`,
            );
            root.classList.toggle(
                "keyboard-visible",
                keyboardOffset > 80,
            );
        });
    };

    syncViewport();
    viewport.addEventListener("resize", syncViewport, {
        passive: true,
    });
    viewport.addEventListener("scroll", syncViewport, {
        passive: true,
    });
    window.addEventListener("orientationchange", syncViewport, {
        passive: true,
    });
    window.addEventListener("focusin", syncViewport);
    window.addEventListener("focusout", () => {
        window.setTimeout(syncViewport, 0);
    });
})();
