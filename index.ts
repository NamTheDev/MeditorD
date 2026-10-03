import { join } from "path";
import { gzipSync } from "node:zlib";
import { PORT, HOST, ROOT } from "./config";
import { getFile } from "./functions/file";
import { getAssetFingerprint, renderPage } from "./functions/render";
import { clean } from "./functions/string";
import { handleApi } from "./functions/api";

const compressedStaticAssetCache = new Map<string, Uint8Array>();

function acceptsGzip(header: string | null): boolean {
  if (!header) return false;

  return header.split(",").some((entry) => {
    const [encoding, ...params] = entry.trim().split(";");
    if (encoding?.trim().toLowerCase() !== "gzip") return false;

    const quality = params
      .map((param) => param.trim())
      .find((param) => param.startsWith("q="));
    if (!quality) return true;

    const value = Number.parseFloat(quality.slice(2));
    return Number.isFinite(value) && value > 0;
  });
}

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
  development: false,
  async fetch(req) {
    const url = new URL(req.url);
    const path = decodeURIComponent(url.pathname);

    if (path.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }

    const apiResponse = await handleApi(req, { prefix: "/api" });
    if (apiResponse) {
      return apiResponse;
    }

    if (path === "/") {
      return Response.redirect("/home.html", 302);
    }

    const relativePath = path.replace(/^\/+/, "");

    if (!path.endsWith(".html")) {
      const rootAsset = Bun.file(join(process.cwd(), ROOT, relativePath));
      if (await rootAsset.exists()) {
        const extension = relativePath.split(".").pop()?.toLowerCase();
        const isCompressibleText =
          extension === "js" || extension === "css";
        const fingerprint = await getAssetFingerprint(`/${relativePath}`);
        const requestedVersion = url.searchParams.get("v");
        const hasCurrentFingerprint =
          Boolean(fingerprint) && requestedVersion === fingerprint;
        const cacheControl = hasCurrentFingerprint
          ? "public, max-age=31536000, immutable"
          : isCompressibleText
            ? "no-cache"
            : "public, max-age=86400, stale-while-revalidate=604800";
        const etag = fingerprint ? `W/"${fingerprint}"` : null;

        if (
          etag &&
          req.headers
            .get("if-none-match")
            ?.split(",")
            .map((value) => value.trim().replace(/^W\//, ""))
            .includes(etag.replace(/^W\//, ""))
        ) {
          const headers = new Headers({
            ETag: etag,
            "Cache-Control": cacheControl,
          });
          if (isCompressibleText) headers.set("Vary", "Accept-Encoding");
          return new Response(null, { status: 304, headers });
        }

        const headers = new Headers({
          "Cache-Control": cacheControl,
        });
        if (etag) headers.set("ETag", etag);
        if (rootAsset.type) headers.set("Content-Type", rootAsset.type);

        if (
          isCompressibleText &&
          acceptsGzip(req.headers.get("accept-encoding"))
        ) {
          const cacheKey = `${relativePath}:${fingerprint ?? "unversioned"}`;
          let compressed = compressedStaticAssetCache.get(cacheKey);
          if (!compressed) {
            compressed = new Uint8Array(
              gzipSync(new Uint8Array(await rootAsset.arrayBuffer())),
            );
            compressedStaticAssetCache.set(cacheKey, compressed);
          }
          headers.set("Content-Encoding", "gzip");
          headers.set("Vary", "Accept-Encoding");
          return new Response(compressed, { headers });
        }

        if (isCompressibleText) headers.set("Vary", "Accept-Encoding");
        return new Response(rootAsset, { headers });
      }
    }

    const fileToFetch = clean(path);
    const file = await getFile(fileToFetch);

    if (file) {
      const pageTitles: Record<string, string> = {
        home: "Home — MeditorD",
        archive: "Archive — MeditorD",
        database: "Database — MeditorD",
        edit: "Editor — MeditorD",
        exit: "Exit — MeditorD",
      };
      const pageTitle =
        pageTitles[fileToFetch] ||
        `${fileToFetch.charAt(0).toUpperCase() + fileToFetch.slice(1)} — MeditorD`;
      return await renderPage(fileToFetch, pageTitle, 200, req);
    }

    return await renderPage("404", "404 Not Found — MeditorD", 404, req);
  },
  error(error) {
    console.error("Server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(
  `📁 Serving files from ${ROOT} at http://${server.hostname}:${server.port}`,
);
console.log("Press Ctrl+C to stop");
