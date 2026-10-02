import { join } from "path";
import { PORT, HOST, ROOT } from "./config";
import { getFile } from "./functions/file";
import { getAssetFingerprint, renderPage } from "./functions/render";
import { clean } from "./functions/string";
import { handleApi } from "./functions/api";

const server = Bun.serve({
  port: PORT,
  hostname: HOST,
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
        const isFingerprintedAsset = extension === "js" || extension === "css";
        const fingerprint = isFingerprintedAsset
          ? await getAssetFingerprint(`/${relativePath}`)
          : null;
        const requestedVersion = url.searchParams.get("v");
        const hasCurrentFingerprint =
          Boolean(fingerprint) && requestedVersion === fingerprint;
        const cacheControl = isFingerprintedAsset
          ? hasCurrentFingerprint
            ? "public, max-age=31536000, immutable"
            : "no-cache"
          : "public, max-age=86400";
        const etag = fingerprint ? `"${fingerprint}"` : null;

        if (
          etag &&
          req.headers
            .get("if-none-match")
            ?.split(",")
            .map((value) => value.trim().replace(/^W\//, ""))
            .includes(etag)
        ) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: etag,
              "Cache-Control": cacheControl,
            },
          });
        }

        const headers = new Headers({
          "Cache-Control": cacheControl,
        });
        if (etag) headers.set("ETag", etag);

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
