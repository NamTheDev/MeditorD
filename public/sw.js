const buildId =
  new URL(self.location.href).searchParams.get("v") || "runtime";

const PAGE_CACHE = `meditord-pages-${buildId}`;
const ASSET_CACHE = `meditord-assets-${buildId}`;
const MEDIA_CACHE = "meditord-media-v1";
const DATA_CACHE = `meditord-data-${buildId}`;
const CACHE_PREFIX = "meditord-";

const APP_PAGES = new Set([
  "/home.html",
  "/archive.html",
  "/database.html",
  "/edit.html",
  "/exit.html",
]);

const PRECACHE_PAGES = [
  "/home.html",
  "/archive.html",
  "/database.html",
  "/edit.html",
  "/exit.html",
];

function pageCacheKey(url) {
  return new Request(`${url.origin}${url.pathname}`, {
    method: "GET",
    credentials: "same-origin",
  });
}

async function putIfCacheable(cache, key, response) {
  if (!response || !response.ok || response.type === "opaque") return response;
  await cache.put(key, response.clone());
  return response;
}

async function precachePages() {
  const cache = await caches.open(PAGE_CACHE);
  await Promise.allSettled(
    PRECACHE_PAGES.map(async (path) => {
      const response = await fetch(path, { cache: "reload" });
      await putIfCacheable(cache, path, response);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(Promise.all([precachePages(), self.skipWaiting()]));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      const cacheNames = await caches.keys();
      const legacyMediaCaches = cacheNames.filter(
        (name) =>
          name.startsWith("meditord-media-") &&
          name !== MEDIA_CACHE,
      );

      if (legacyMediaCaches.length) {
        const mediaCache = await caches.open(MEDIA_CACHE);
        for (const name of legacyMediaCaches) {
          const legacyCache = await caches.open(name);
          const requests = await legacyCache.keys();
          for (const request of requests) {
            const response = await legacyCache.match(request);
            if (response) {
              await mediaCache.put(request, response);
            }
          }
        }
      }

      await Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith(CACHE_PREFIX) &&
              ![PAGE_CACHE, ASSET_CACHE, MEDIA_CACHE, DATA_CACHE].includes(name),
          )
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

async function revalidatePage(event, request, key, cachedResponse) {
  try {
    const preloaded = await event.preloadResponse;
    const response =
      preloaded ||
      (await fetch(new Request(request, { cache: "no-cache" })));

    if (!response?.ok) return;

    const cachedEtag = cachedResponse?.headers.get("etag");
    const networkEtag = response.headers.get("etag");
    const cache = await caches.open(PAGE_CACHE);
    await cache.put(key, response.clone());

    if (
      cachedResponse &&
      networkEtag &&
      cachedEtag &&
      networkEtag !== cachedEtag
    ) {
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({
          type: "meditord-page-cache-updated",
          path: new URL(request.url).pathname,
          etag: networkEtag,
        });
      }
    }
  } catch {}
}

async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);
  const key = pageCacheKey(url);
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(key);

  // Explicitly bypass stale-while-revalidate for layout diagnostics or
  // troubleshooting. Normal navigation keeps the offline-first behavior.
  if (url.searchParams.get("fresh") === "1") {
    try {
      const response = await fetch(new Request(request, { cache: "reload" }));
      return await putIfCacheable(cache, key, response);
    } catch {
      if (cached) return cached;
    }
  }

  if (cached) {
    event.waitUntil(revalidatePage(event, request, key, cached));
    return cached;
  }

  try {
    const preloaded = await event.preloadResponse;
    const response = preloaded || (await fetch(request));
    return await putIfCacheable(cache, key, response);
  } catch {
    return (
      (await cache.match("/home.html")) ||
      new Response("MeditorD is unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  return await putIfCacheable(cache, request, response);
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const update = fetch(new Request(request, { cache: "no-cache" }))
    .then((response) => putIfCacheable(cache, request, response))
    .catch(() => null);

  if (cached) {
    event.waitUntil(update);
    return cached;
  }

  const response = await update;
  if (response) return response;
  return new Response(JSON.stringify({ error: "Offline" }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function invalidateDynamicCaches() {
  const pageCache = await caches.open(PAGE_CACHE);
  await Promise.all([
    pageCache.delete("/archive.html"),
    pageCache.delete("/database.html"),
    caches.delete(DATA_CACHE),
  ]);
}

async function handleMutation(request) {
  const response = await fetch(request);
  if (response.ok) {
    await invalidateDynamicCaches();
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.method !== "GET") {
    if (url.pathname.startsWith("/api/")) {
      event.respondWith(handleMutation(request));
    }
    return;
  }

  if (
    request.mode === "navigate" &&
    APP_PAGES.has(url.pathname)
  ) {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (
    (
      url.pathname.startsWith("/api/media/") ||
      url.pathname.startsWith("/api/media-thumbnail/")
    ) &&
    url.searchParams.has("v") &&
    !url.searchParams.has("download") &&
    !request.headers.has("range")
  ) {
    event.respondWith(cacheFirst(request, MEDIA_CACHE));
    return;
  }

  if (
    url.pathname === "/api/documents" &&
    url.searchParams.get("database") === "true"
  ) {
    event.respondWith(staleWhileRevalidate(event, request, DATA_CACHE));
    return;
  }

  if (
    url.searchParams.has("v") &&
    (
      url.pathname.startsWith("/css/") ||
      url.pathname.startsWith("/js/") ||
      url.pathname.startsWith("/media/") ||
      url.pathname.startsWith("/vendor/")
    )
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
