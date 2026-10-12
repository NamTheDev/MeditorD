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

// The complete local app shell is cached by build ID, independent of SQLite
// content and hashed post media. Fonts are same-origin and work offline.
const FONT_ASSETS = [
  "/fonts/01c04f4d69ca47be.woff2",
  "/fonts/06a00cf15830e987.woff2",
  "/fonts/0b5c2db191621518.woff2",
  "/fonts/0df26f35f561af8d.woff2",
  "/fonts/0e213dc59c137688.woff2",
  "/fonts/11ced52deb54070d.woff2",
  "/fonts/155bc5d4aa04bfb0.woff2",
  "/fonts/2532acb5e3041baf.woff2",
  "/fonts/2d8cfbcbf9ec7629.woff2",
  "/fonts/2eab9668f909a1cb.woff2",
  "/fonts/33ff57e97518ac70.woff2",
  "/fonts/3ac757485912968d.woff2",
  "/fonts/4065b246a6a3a332.woff2",
  "/fonts/466e6a68c4ee3f94.woff2",
  "/fonts/4e183d488cda203f.woff2",
  "/fonts/5778b1a208141d42.woff2",
  "/fonts/629b63da958cc8b3.woff2",
  "/fonts/7300d08cc3cf7909.woff2",
  "/fonts/757e9d7228a62b17.woff2",
  "/fonts/7744a5a46dc6d551.woff2",
  "/fonts/784e5ede32c4cdea.woff2",
  "/fonts/831b24d66d162c0f.woff2",
  "/fonts/839c38410d1a25b2.woff2",
  "/fonts/8998599c66c8fbe3.woff2",
  "/fonts/917577ede7adc104.woff2",
  "/fonts/9d44a92983acf712.woff2",
  "/fonts/9db1dd0fa5bc64ca.woff2",
  "/fonts/a42b6e465d3ca536.woff2",
  "/fonts/b05e6a7c9b00e462.woff2",
  "/fonts/bde7db92496666b1.woff2",
  "/fonts/c3a25aa85495bee4.woff2",
  "/fonts/c4f4a8cd0b92a14a.woff2",
  "/fonts/cb1a242b907c798c.woff2",
  "/fonts/cf65f680c0c97e6e.woff2",
  "/fonts/da9e68f458e4d3db.woff2",
  "/fonts/efbd4e0b7034b5e3.woff2",
  "/fonts/f776288548a3e1d9.woff2",
  "/fonts/f798d93bcc10a932.woff2",
];
const SHELL_STATIC_ASSETS = [
  "/css/fonts.css",
  "/media/icon.webp",
  "/media/grass-background.webp",
  "/media/green-arrow.webp",
  "/media/home-background.webp",
  ...FONT_ASSETS,
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

async function precacheAppShell() {
  const pages = await caches.open(PAGE_CACHE);
  const assets = await caches.open(ASSET_CACHE);
  const assetsToCache = new Set(SHELL_STATIC_ASSETS);
  const pageResults = await Promise.allSettled(PRECACHE_PAGES.map(async path => {
    const response = await fetch(path, { cache: "reload" });
    if (!response.ok) throw new Error("Page unavailable: " + path);
    await pages.put(path, response.clone());
    const html = await response.text();
    for (const match of html.matchAll(/(?:src|href)="(\/(?:css|js|media|vendor|fonts)\/[^"]+)"/g)) {
      assetsToCache.add(match[1].replace(/&amp;/g, "&"));
    }
  }));

  const assetResults = await Promise.allSettled([...assetsToCache].map(async path => {
    const response = await fetch(path, { cache: "reload" });
    if (!response.ok) throw new Error("Asset unavailable: " + path);
    await assets.put(path, response);
  }));

  const complete = pageResults.every(result => result.status === "fulfilled") &&
    assetResults.every(result => result.status === "fulfilled");
  if (!complete) {
    throw new Error("App shell precache failed; retaining the previous worker.");
  }
  await assets.put("/__meditord_shell_ready__", new Response(buildId));
}

self.addEventListener("install", event => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("message", event => {
  if (event.data?.type !== "meditord-shell-status") return;
  const port = event.ports?.[0];
  if (!port) return;
  event.waitUntil(
    caches.open(ASSET_CACHE)
      .then(cache => cache.match("/__meditord_shell_ready__"))
      .then(response => port.postMessage({ ready: !!response }))
      .catch(() => port.postMessage({ ready: false })),
  );
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

async function handleNavigation(event) {
  const request = event.request;
  const url = new URL(request.url);
  const key = pageCacheKey(url);
  const cache = await caches.open(PAGE_CACHE);
  const cached = await cache.match(key);
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 2200);

  try {
    // Network-first HTML guarantees new posts and changed asset fingerprints
    // on reload, while Cache Storage provides a full offline fallback.
    const response = await fetch(new Request(request, {
      cache: url.searchParams.get("fresh") === "1" ? "reload" : "no-cache",
      signal: controller.signal,
    }));
    if (!response.ok) {
      if (cached) return cached;
      return response;
    }
    await cache.put(key, response.clone());
    return response;
  } catch {
    if (cached) return cached;
    return (
      (await cache.match("/home.html")) ||
      new Response("MeditorD is unavailable offline.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  } finally {
    clearTimeout(deadline);
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
    url.pathname.startsWith("/css/") ||
    url.pathname.startsWith("/js/") ||
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/media/") ||
    url.pathname.startsWith("/vendor/")
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
  }
});
