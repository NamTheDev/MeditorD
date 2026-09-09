import { join } from "path";
import { PORT, HOST, ROOT } from "./config";
import { getFile } from "./functions/file";
import { renderPage } from "./functions/render";
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
        return new Response(rootAsset);
      }
    }

    const fileToFetch = clean(path);
    const file = await getFile(fileToFetch);

    if (file) {
      return await renderPage(fileToFetch, fileToFetch);
    }

    return await renderPage("404", "404 - Page Not Found", 404);
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