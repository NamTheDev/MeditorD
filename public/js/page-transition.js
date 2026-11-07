(() => {
  const root = document.documentElement;
  const transitionDuration = 150;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let navigating = false;

  function revealPage() {
    window.requestAnimationFrame(() => {
      root.classList.add("meditord-page-visible");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", revealPage, { once: true });
  } else {
    revealPage();
  }

  // A restored back/forward-cache page must not stay covered by the exit fade.
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    navigating = false;
    root.classList.remove("meditord-page-leaving");
    root.classList.add("meditord-page-visible");
  });

  function navigate(target, { replace = false } = {}) {
    if (navigating) return;
    const url = new URL(target, window.location.href);
    const go = () => {
      if (replace) window.location.replace(url.href);
      else window.location.assign(url.href);
    };

    // Never delay external destinations or a user who prefers less motion.
    if (url.origin !== window.location.origin || reduceMotion.matches) {
      go();
      return;
    }
    if (url.href === window.location.href) return;

    navigating = true;
    root.classList.add("meditord-page-leaving");
    window.setTimeout(go, transitionDuration);
  }

  // Existing links work without changing each page's markup.
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const anchor = event.target instanceof Element
      ? event.target.closest("a[href]")
      : null;
    if (!anchor || anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")) return;

    const url = new URL(anchor.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      !(url.pathname === "/" || url.pathname.endsWith(".html")) ||
      (url.pathname === window.location.pathname &&
        url.search === window.location.search)
    ) return;

    event.preventDefault();
    navigate(url.href);
  });

  window.meditordNavigate = navigate;
})();
