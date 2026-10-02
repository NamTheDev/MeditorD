import * as db from "../database";
import { isSupportedPostUrl } from "../url";

export interface ApiConfig {
  prefix?: string;
}

function ifNoneMatchMatches(header: string | null, etag: string): boolean {
  if (!header) return false;
  const target = etag.replace(/^W\//, "");
  return header
    .split(",")
    .map((value) => value.trim())
    .some((value) => value === "*" || value.replace(/^W\//, "") === target);
}

export async function handleApi(
  req: Request,
  config: ApiConfig = { prefix: "/api" },
): Promise<Response | null> {
  const url = new URL(req.url);
  const prefix = config.prefix || "/api";

  if (!url.pathname.startsWith(prefix)) {
    return null;
  }

  const endpoint = url.pathname.slice(prefix.length).replace(/\/+$/, "") || "/";
  const method = req.method.toUpperCase();

  try {
    if (endpoint === "/documents" && method === "GET") {
      if (url.searchParams.get("full") === "true") {
        const etag = db.getArchiveValidator();
        if (ifNoneMatchMatches(req.headers.get("if-none-match"), etag)) {
          return new Response(null, {
            status: 304,
            headers: {
              ETag: etag,
              "Cache-Control": "no-cache",
            },
          });
        }

        const items = await db.getAllDocuments();
        return Response.json(items, {
          headers: {
            ETag: etag,
            "Cache-Control": "no-cache",
          },
        });
      }
      const items = await db.listDocuments();
      return Response.json(items);
    }

    if (endpoint.startsWith("/documents/") && method === "GET") {
      const title = decodeURIComponent(endpoint.slice("/documents/".length));
      const doc = await db.getDocumentByTitle(title);
      if (!doc) return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json(doc);
    }

    if (endpoint.startsWith("/media/") && method === "GET") {
      const title = decodeURIComponent(endpoint.slice("/media/".length));
      const metadata = db.getDocumentMediaMetadata(title);
      if (!metadata) {
        return Response.json({ error: "Media not found" }, { status: 404 });
      }

      const etag = `"m${metadata.hash}"`;
      const requestedVersion = url.searchParams.get("v");
      const cacheControl =
        requestedVersion === metadata.hash
          ? "public, max-age=31536000, immutable"
          : "no-cache";

      if (ifNoneMatchMatches(req.headers.get("if-none-match"), etag)) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: etag,
            "Cache-Control": cacheControl,
          },
        });
      }

      const media = await db.getDocumentMedia(title);
      if (!media) {
        return Response.json({ error: "Media not found" }, { status: 404 });
      }

      return new Response(media.data, {
        headers: {
          "Content-Type": media.type,
          "Content-Disposition": [
            url.searchParams.get("download") === "true" ? "attachment" : "inline",
            media.name
              ? `filename="${encodeURIComponent(media.name)}"`
              : "",
          ]
            .filter(Boolean)
            .join("; "),
          ETag: etag,
          "Cache-Control": cacheControl,
        },
      });
    }

    if (endpoint === "/documents" && method === "POST") {
      const contentType = req.headers.get("content-type") ?? "";
      let title: string | undefined;
      let username = "";
      let content = "";
      let url = "";
      let media: File | undefined;
      let isFolder = false;

      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        title = form.get("title")?.toString();
        username = form.get("username")?.toString() ?? "";
        content = form.get("content")?.toString() ?? "";
        url = form.get("url")?.toString() ?? "";
        isFolder = form.get("isFolder") === "true";
        const uploadedMedia = form.get("media");
        if (uploadedMedia instanceof File && uploadedMedia.size > 0) {
          if (
            !uploadedMedia.type.startsWith("image/") &&
            !uploadedMedia.type.startsWith("video/")
          ) {
            return Response.json(
              { error: "Only image and video files are supported" },
              { status: 415 },
            );
          }
          media = uploadedMedia;
        }
      } else {
        const body = (await req.json()) as {
          title?: string;
          username?: string;
          content?: string;
          url?: string;
          isFolder?: boolean;
        };
        title = body.title;
        username = body.username ?? "";
        content = body.content ?? "";
        url = body.url ?? "";
        isFolder = body.isFolder ?? false;
      }

      if (!title) {
        return Response.json({ error: "Title is required" }, { status: 400 });
      }

      if (isFolder) {
        await db.createFolder(title);
        return Response.json({ title, isDirectory: true }, { status: 201 });
      }

      if (!url.trim() && !media && !content.trim()) {
        return Response.json(
          {
            error: "Either description, URL, or an uploaded media is required.",
          },
          { status: 400 },
        );
      }
      if (url.trim() && !isSupportedPostUrl(url.trim())) {
        return Response.json(
          {
            error: "Supported URL types are HTTP(S) websites and YouTube URLs.",
          },
          { status: 415 },
        );
      }

      const saved = await db.saveDocument(title, username, content, url, media);
      return Response.json(saved, { status: 201 });
    }

    if (endpoint.startsWith("/documents/") && method === "PUT") {
      const oldTitle = decodeURIComponent(endpoint.slice("/documents/".length));
      const contentType = req.headers.get("content-type") ?? "";
      if (!contentType.includes("multipart/form-data")) {
        const body = (await req.json()) as { newTitle?: string };
        if (!body.newTitle) {
          return Response.json(
            { error: "New title is required" },
            { status: 400 },
          );
        }
        const success = await db.renameItem(oldTitle, body.newTitle);
        if (!success) {
          return Response.json({ error: "Item not found" }, { status: 404 });
        }
        return Response.json({ success: true });
      }

      const form = await req.formData();
      const title = form.get("title")?.toString().trim();
      if (!title) {
        return Response.json({ error: "Title is required" }, { status: 400 });
      }
      const url = form.get("url")?.toString().trim() ?? "";
      if (url && !isSupportedPostUrl(url)) {
        return Response.json(
          {
            error: "Supported URL types are HTTP(S) websites and YouTube URLs.",
          },
          { status: 415 },
        );
      }
      const uploadedMedia = form.get("media");
      const media =
        uploadedMedia instanceof File && uploadedMedia.size > 0
          ? uploadedMedia
          : undefined;
      if (
        media &&
        !media.type.startsWith("image/") &&
        !media.type.startsWith("video/")
      ) {
        return Response.json(
          { error: "Only image and video files are supported" },
          { status: 415 },
        );
      }
      const existing = await db.getDocumentByTitle(oldTitle);
      if (!existing) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      if (
        !url &&
        !media &&
        !form.get("content")?.toString().trim() &&
        (!existing.hasMedia || form.get("removeMedia") === "true")
      ) {
        return Response.json(
          {
            error: "Either description, URL, or an uploaded media is required.",
          },
          { status: 400 },
        );
      }
      const updated = await db.updateDocument(
        oldTitle,
        title,
        form.get("username")?.toString() ?? "",
        form.get("content")?.toString() ?? "",
        url,
        form.get("createdAt")?.toString() ?? "",
        media,
        form.get("removeMedia") === "true",
      );
      if (!updated) {
        return Response.json({ error: "Item not found" }, { status: 404 });
      }
      return Response.json(updated);
    }

    if (endpoint.startsWith("/documents/") && method === "DELETE") {
      const title = decodeURIComponent(endpoint.slice("/documents/".length));
      const success = await db.deleteDocument(title);
      if (!success)
        return Response.json({ error: "Not found" }, { status: 404 });
      return Response.json({ success: true });
    }

    return Response.json(
      { error: "Method or route not allowed" },
      { status: 405 },
    );
  } catch (err: any) {
    return Response.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
