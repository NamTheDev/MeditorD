import { expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { runInNewContext } from "node:vm";

const swSource = readFileSync("public/sw.js", "utf8");
const fontCss = readFileSync("public/css/fonts.css", "utf8");
const template = readFileSync("public/global.html", "utf8");
const fontFiles = readdirSync("public/fonts").filter(name => name.endsWith(".woff2"));
const origin = "https://meditord.test";
type Handler = (event: any) => void;

function worker(buildId: string, storage = new Map<string, Map<string, any>>()) {
  const handlers = new Map<string, Handler>();
  let offline = false;
  const codeHash = buildId === "second" ? "def" : "abc";
  let freshPage = `<html><script src="/js/archive.js?v=${codeHash}"></script><link rel="stylesheet" href="/css/global.css?v=xyz"></html>`;
  const fetched: string[] = [];
  const urlFor = (value: Request | string) => new URL(typeof value === "string" ? value : value.url, origin).href;
  const caches = {
    async open(name: string) {
      if (!storage.has(name)) storage.set(name, new Map());
      const entries = storage.get(name)!;
      return {
        async match(key: string | Request) { return entries.get(urlFor(key))?.clone(); },
        async put(key: string | Request, value: any) { entries.set(urlFor(key), value.clone()); },
        async delete(key: string | Request) { return entries.delete(urlFor(key)); },
      };
    },
    async keys() { return [...storage.keys()]; },
    async delete(name: string) { return storage.delete(name); },
  };
  const mockFetch = async (input: Request | string) => {
    if (offline) throw new Error("offline");
    const url = urlFor(input);
    fetched.push(url);
    const path = new URL(url).pathname;
    if (path.endsWith(".html")) {
      return new Response(path === "/archive.html" ? freshPage : `<html><script src="/js/archive.js?v=${codeHash}"></script></html>`, {
        status: 200, headers: { "Content-Type": "text/html" },
      });
    }
    return new Response(path.endsWith(".woff2") ? new Uint8Array([119, 79, 70, 50]) : "asset", { status: 200 });
  };
  const self = {
    location: { href: origin + "/sw.js?v=" + buildId, origin },
    addEventListener(name: string, handler: Handler) { handlers.set(name, handler); },
    async skipWaiting() {},
    clients: { async claim() {} },
    registration: { navigationPreload: { async enable() {} } },
  };
  runInNewContext(swSource, {
    self, caches, fetch: mockFetch, URL, Request, Response, AbortController,
    setTimeout, clearTimeout, Promise, Uint8Array, Error,
  });

  async function dispatch(name: string, event: any) {
    const promises: Promise<unknown>[] = [];
    let responsePromise: Promise<any> | undefined;
    const augmented = {
      ...event,
      waitUntil(promise: Promise<unknown>) { promises.push(promise); },
      respondWith(promise: Promise<any>) { responsePromise = promise; },
    };
    handlers.get(name)?.(augmented);
    const response = responsePromise && await responsePromise;
    await Promise.all(promises);
    return response;
  }
  return {
    dispatch,
    storage,
    fetched,
    setOffline(value: boolean) { offline = value; },
    setPage(value: string) { freshPage = value; },
    async navigate(path = "/archive.html") {
      const request = new Request(origin + path);
      Object.defineProperty(request, "mode", { value: "navigate" });
      return dispatch("fetch", { request });
    },
    async asset(path: string) { return dispatch("fetch", { request: new Request(origin + path) }); },
  };
}

test("font assets are local, valid, and included in the offline shell", () => {
  expect(fontFiles.length).toBeGreaterThan(30);
  expect(fontCss).not.toContain("fonts.googleapis.com");
  expect(fontCss).not.toContain("fonts.gstatic.com");
  for (const file of fontFiles) {
    expect(readFileSync("public/fonts/" + file).subarray(0, 4).toString()).toBe("wOF2");
    expect(swSource).toContain('"/fonts/' + file + '"');
  }
  expect(template).toContain('href="/css/fonts.css"');
  expect(template).toContain("Loading...");
  expect(template).toContain('class="app-loading-track"');
  expect(template).not.toContain("fonts.googleapis.com");
  expect(template).toContain("meditordServiceWorkerReady");
});

test("install caches full site, offline navigation, versioned assets, and upgrades", async () => {
  const storage = new Map<string, Map<string, any>>();
  const one = worker("first", storage);
  await one.dispatch("install", {});
  await one.dispatch("activate", {});

  expect(storage.get("meditord-pages-first")?.size).toBe(5);
  const assets = storage.get("meditord-assets-first")!;
  expect(assets.size).toBeGreaterThan(fontFiles.length + 5);
  expect(assets.has(origin + "/fonts/" + fontFiles[0])).toBe(true);
  expect(assets.has(origin + "/js/archive.js?v=abc")).toBe(true);
  expect(assets.has(origin + "/__meditord_shell_ready__")).toBe(true);

  const messages: any[] = [];
  await one.dispatch("message", {
    data: { type: "meditord-shell-status" },
    ports: [{ postMessage(value: any) { messages.push(value); } }],
  });
  expect(messages).toEqual([{ ready: true }]);

  one.setPage("<html>Brand-new post</html>");
  expect(await (await one.navigate("/archive.html?folder=Art"))?.text()).toContain("Brand-new post");
  one.setOffline(true);
  expect(await (await one.navigate("/archive.html?folder=Art"))?.text()).toContain("Brand-new post");
  expect(await (await one.asset("/js/archive.js?v=abc"))?.text()).toBe("asset");
  expect(await (await one.asset("/fonts/" + fontFiles[0]))?.arrayBuffer()).toBeTruthy();

  const two = worker("second", storage);
  await two.dispatch("install", {});
  await two.dispatch("activate", {});
  expect(storage.has("meditord-pages-first")).toBe(false);
  expect(storage.has("meditord-assets-first")).toBe(false);
  expect(storage.has("meditord-pages-second")).toBe(true);
  expect(storage.has("meditord-assets-second")).toBe(true);
  expect(storage.get("meditord-assets-second")?.has(origin + "/js/archive.js?v=def")).toBe(true);
  expect(storage.get("meditord-assets-second")?.has(origin + "/js/archive.js?v=abc")).toBe(false);
  two.setOffline(true);
  expect(await (await two.asset("/js/archive.js?v=def"))?.text()).toBe("asset");
  expect(storage.has("meditord-media-v1")).toBe(false);
});

test("incomplete updates do not activate or remove the last complete shell", async () => {
  const storage = new Map<string, Map<string, any>>();
  const old = worker("previous", storage);
  await old.dispatch("install", {});
  await old.dispatch("activate", {});
  const update = worker("incomplete", storage);
  update.setOffline(true);
  await expect(update.dispatch("install", {})).rejects.toThrow("App shell precache failed");
  expect(storage.has("meditord-pages-previous")).toBe(true);
  expect(storage.has("meditord-assets-previous")).toBe(true);
  expect(storage.get("meditord-assets-incomplete")?.has(origin + "/__meditord_shell_ready__")).toBe(false);
});
