(() => {
  const root = document.documentElement;
  const overlay = document.getElementById("appLoadingOverlay");
  if (!overlay || !root.classList.contains("meditord-cold-shell")) return;

  const progress = overlay.querySelector("[role='progressbar']");
  const fill = overlay.querySelector(".app-loading-fill");
  const buildId = document.querySelector(
    'meta[name="meditord-build-id"]',
  )?.content;
  const readyKey = "meditord-shell-ready";
  const started = performance.now();
  let finished = false;

  function update(value) {
    if (finished) return;
    progress?.setAttribute("aria-valuenow", String(value));
    if (fill) fill.style.width = value + "%";
  }

  function complete(cacheReady = false) {
    if (finished) return;
    finished = true;
    if (cacheReady && buildId) {
      try {
        localStorage.setItem(readyKey, buildId);
      } catch {}
    }
    progress?.setAttribute("aria-valuenow", "100");
    if (fill) fill.style.width = "100%";
    root.classList.remove("meditord-cold-shell");
    overlay.setAttribute("aria-hidden", "true");
    window.setTimeout(() => overlay.remove(), 250);
  }

  const deadline = window.setTimeout(() => complete(false), 5000);
  const domReady =
    document.readyState === "loading"
      ? new Promise((resolve) =>
          document.addEventListener("DOMContentLoaded", resolve, {
            once: true,
          }),
        )
      : Promise.resolve();
  const pageReady =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise((resolve) =>
          window.addEventListener("load", resolve, { once: true }),
        );
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  async function shellCached() {
    const registration = await window.meditordServiceWorkerReady;
    if (!registration?.active) return false;
    if (
      new URL(registration.active.scriptURL).searchParams.get("v") !== buildId
    )
      return false;
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      const timeout = window.setTimeout(() => resolve(false), 1200);
      channel.port1.onmessage = (event) => {
        window.clearTimeout(timeout);
        channel.port1.close();
        resolve(event.data?.ready === true);
      };
      registration.active.postMessage({ type: "meditord-shell-status" }, [
        channel.port2,
      ]);
    });
  }

  void (async () => {
    await domReady;
    update(25);
    await Promise.all([pageReady, fontsReady]);
    update(70);
    const cached = await shellCached().catch(() => false);
    update(95);
    const minimum = Math.max(0, 380 - (performance.now() - started));
    if (minimum)
      await new Promise((resolve) => window.setTimeout(resolve, minimum));
    window.clearTimeout(deadline);
    complete(
      cached || !("serviceWorker" in navigator) || !window.isSecureContext,
    );
  })().catch(() => {
    window.clearTimeout(deadline);
    complete(false);
  });
})();
